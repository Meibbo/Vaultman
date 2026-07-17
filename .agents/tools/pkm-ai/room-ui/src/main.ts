import { mount } from "svelte";
import App from "./App.svelte";
import "virtual:uno.css";
import "./styles.css";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app mount point");

mount(App, { target });
