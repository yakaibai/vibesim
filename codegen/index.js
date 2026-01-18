import { generateC } from "./c.js";
import { generatePython } from "./python.js";
import { generateTikz } from "./tikz.js";

export const generateCode = ({ lang = "c", sampleTime = 0.01, includeMain = true, diagram }) => {
  if (lang === "c") {
    return generateC(diagram, { sampleTime, includeMain });
  }
  if (lang === "python") {
    return generatePython(diagram, { sampleTime, includeMain });
  }
  if (lang === "tikz") {
    return generateTikz(diagram);
  }
  throw new Error(`Unsupported language: ${lang}`);
};
