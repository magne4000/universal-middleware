import { createEsbuildPlugin } from "unplugin";
import plugin from "./plugin.js";

export default createEsbuildPlugin(plugin);
