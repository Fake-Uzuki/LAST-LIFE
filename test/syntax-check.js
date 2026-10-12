const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function checkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        // Validate ES module syntax using node --input-type=module
        execSync(`node --input-type=module --check`, {
          input: content
        });
        console.log(`✔ Syntax OK: ${path.relative(process.cwd(), fullPath)}`);
      } catch (err) {
        console.error(`✖ Syntax Error in: ${fullPath}\n${err.message}`);
        process.exit(1);
      }
    }
  }
}

console.log("Checking ES Module syntax across BP/scripts...");
checkDir(path.join(__dirname, "../BP/scripts"));
console.log("All JavaScript ES module files have 100% valid syntax!");
