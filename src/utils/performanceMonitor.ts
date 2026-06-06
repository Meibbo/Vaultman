export interface VaultmanPerfEntry {
	label: string;
	ms: number;
	at: number;
	detail?: Record<string, unknown>;
}

export interface VaultmanPerfSample {
	at: number;
	fps: number;
	longTasks: number;
	longTaskMs: number;
	mainThreadPressure: number;
	memoryMb?: number;
	cpuPercent?: number;
}

export interface VaultmanPerfAction {
	surface: string;
	name: string;
	at: number;
	detail?: Record<string, unknown>;
}

export interface VaultmanPerformanceMonitorOptions {
	entryLimit?: number;
	sampleLimit?: number;
	actionLimit?: number;
	sampleIntervalMs?: number;
	thresholdMs?: number;
}

interface ElectronProcessLike {
	getCPUUsage?: () => {
		percentCPUUsage?: number;
	};
}

type LongTaskObserver = PerformanceObserver & {
	observe: (options: { entryTypes: string[] }) => void;
};

export class VaultmanPerformanceMonitor {
	private entries: VaultmanPerfEntry[] = [];
	private sampleEntries: VaultmanPerfSample[] = [];
	private actionEntries: VaultmanPerfAction[] = [];
	private readonly entryLimit: number;
	private readonly sampleLimit: number;
	private readonly actionLimit: number;
	private readonly sampleIntervalMs: number;
	private sampleTimer: number | null = null;
	private rafId: number | null = null;
	private observer: LongTaskObserver | null = null;
	private frameCount = 0;
	private longTaskCount = 0;
	private longTaskMs = 0;
	private lastSampleAt = 0;
	private samplingRefs = 0;
	thresholdMs: number;

	constructor(options: VaultmanPerformanceMonitorOptions = {}) {
		this.entryLimit = options.entryLimit ?? 200;
		this.sampleLimit = options.sampleLimit ?? 180;
		this.actionLimit = options.actionLimit ?? 120;
		this.sampleIntervalMs = options.sampleIntervalMs ?? 2000;
		this.thresholdMs = options.thresholdMs ?? 50;
	}

	record(label: string, ms: number, detail?: Record<string, unknown>): void {
		const entry: VaultmanPerfEntry = {
			label,
			ms,
			at: Date.now(),
			detail,
		};
		this.entries.push(entry);
		if (this.entries.length > this.entryLimit) {
			this.entries.splice(0, this.entries.length - this.entryLimit);
		}
		if (ms >= this.thresholdMs) {
			console.warn(
				`[Vaultman perf] ${label}: ${ms.toFixed(1)}ms`,
				detail ?? {},
			);
		}
	}

	measure<T>(label: string, fn: () => T, detail?: Record<string, unknown>): T {
		const start = performance.now();
		try {
			return fn();
		} finally {
			this.record(label, performance.now() - start, detail);
		}
	}

	async measureAsync<T>(
		label: string,
		fn: () => Promise<T>,
		detail?: Record<string, unknown>,
	): Promise<T> {
		const start = performance.now();
		try {
			return await fn();
		} finally {
			this.record(label, performance.now() - start, detail);
		}
	}

	recent(limit = 50): VaultmanPerfEntry[] {
		return this.entries.slice(-limit);
	}

	recordSample(
		sample: Omit<VaultmanPerfSample, 'at' | 'longTaskMs'> & {
			at?: number;
			longTaskMs?: number;
		},
	): void {
		const entry: VaultmanPerfSample = {
			at: sample.at ?? Date.now(),
			fps: Math.max(0, sample.fps),
			longTasks: Math.max(0, sample.longTasks),
			longTaskMs: Math.max(0, sample.longTaskMs ?? 0),
			mainThreadPressure: Math.max(0, Math.min(1, sample.mainThreadPressure)),
			memoryMb: sample.memoryMb,
			cpuPercent: sample.cpuPercent,
		};
		this.sampleEntries.push(entry);
		if (this.sampleEntries.length > this.sampleLimit) {
			this.sampleEntries.splice(
				0,
				this.sampleEntries.length - this.sampleLimit,
			);
		}
	}

	samples(limit = 60): VaultmanPerfSample[] {
		return this.sampleEntries.slice(-limit);
	}

	latestSample(): VaultmanPerfSample | undefined {
		return this.sampleEntries.at(-1);
	}

	recordAction(
		surface: string,
		name: string,
		detail?: Record<string, unknown>,
	): void {
		this.actionEntries.push({
			surface,
			name,
			at: Date.now(),
			detail,
		});
		if (this.actionEntries.length > this.actionLimit) {
			this.actionEntries.splice(
				0,
				this.actionEntries.length - this.actionLimit,
			);
		}
	}

	actions(limit = 20): VaultmanPerfAction[] {
		return this.actionEntries.slice(-limit);
	}

	retainSampling(): () => void {
		this.samplingRefs += 1;
		this.startSampling();
		return () => {
			this.samplingRefs = Math.max(0, this.samplingRefs - 1);
			if (this.samplingRefs === 0) this.stopSampling();
		};
	}

	startSampling(): void {
		if (typeof window === 'undefined' || this.sampleTimer !== null) return;
		this.lastSampleAt = performance.now();
		this.frameCount = 0;
		this.longTaskCount = 0;
		this.longTaskMs = 0;

		const loop = () => {
			this.frameCount += 1;
			this.rafId = window.requestAnimationFrame(loop);
		};
		this.rafId = window.requestAnimationFrame(loop);

		if (typeof PerformanceObserver !== 'undefined') {
			try {
				this.observer = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						this.longTaskCount += 1;
						this.longTaskMs += entry.duration;
					}
				}) as LongTaskObserver;
				this.observer.observe({ entryTypes: ['longtask'] });
			} catch {
				this.observer = null;
			}
		}

		this.sampleTimer = window.setInterval(() => {
			this.collectSample();
		}, this.sampleIntervalMs);
	}

	stopSampling(): void {
		if (this.rafId !== null && typeof window !== 'undefined') {
			window.cancelAnimationFrame(this.rafId);
		}
		if (this.sampleTimer !== null) {
			window.clearInterval(this.sampleTimer);
		}
		this.observer?.disconnect();
		this.rafId = null;
		this.sampleTimer = null;
		this.observer = null;
	}

	clear(): void {
		this.entries = [];
		this.sampleEntries = [];
		this.actionEntries = [];
	}

	private collectSample(): void {
		const now = performance.now();
		const elapsedMs = Math.max(1, now - this.lastSampleAt);
		const fps = Math.round((this.frameCount * 1000) / elapsedMs);
		const longTaskMs = this.longTaskMs;
		this.recordSample({
			fps,
			longTasks: this.longTaskCount,
			longTaskMs,
			mainThreadPressure: Math.min(1, longTaskMs / elapsedMs),
			memoryMb: this.readMemoryMb(),
			cpuPercent: this.readCpuPercent(),
		});
		this.frameCount = 0;
		this.longTaskCount = 0;
		this.longTaskMs = 0;
		this.lastSampleAt = now;
	}

	private readMemoryMb(): number | undefined {
		const perf = performance as Performance & {
			memory?: { usedJSHeapSize?: number };
		};
		const used = perf.memory?.usedJSHeapSize;
		return typeof used === 'number'
			? Math.round(used / 1024 / 1024)
			: undefined;
	}

	private readCpuPercent(): number | undefined {
		if (typeof window === 'undefined') return undefined;
		const processLike = (window as Window & { process?: ElectronProcessLike })
			.process;
		const usage = processLike?.getCPUUsage?.();
		const percent = usage?.percentCPUUsage;
		return typeof percent === 'number' ? Math.round(percent) : undefined;
	}
}

export const vaultmanPerfMonitor = new VaultmanPerformanceMonitor();

declare global {
	interface Window {
		__vaultmanPerf?: VaultmanPerformanceMonitor;
	}
}

if (typeof window !== 'undefined') {
	window.__vaultmanPerf = vaultmanPerfMonitor;
}
