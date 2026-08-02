export interface PropertyValueInteractionPort {
	renameValue(command: {
		property: string;
		oldValue: string;
		newValue: string;
		valueType: 'checkbox' | 'date' | 'datetime';
	}): Promise<void>;
}
