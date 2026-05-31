const { spawn } = require("child_process");
const path = require("path");

const rootDir = __dirname;
const frontendDir = path.join(rootDir, "frontend");
const backendDir = path.join(rootDir, "backend");

function start(command, args, cwd, label) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    windowsHide: false,
  });

  child.on("error", (error) => {
    console.error(`${label} failed to start:`, error.message);
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}`);
      process.exitCode = code;
    } else if (signal) {
      console.error(`${label} exited due to signal ${signal}`);
    }
  });

  return child;
}

console.log("Starting CareerPilot dev servers...");
console.log("Frontend: http://localhost:3000");
console.log("Backend:  http://127.0.0.1:8000");

start("cmd.exe", ["/c", "python", "-m", "uvicorn", "app.main:app", "--reload"], backendDir, "Backend");
start("cmd.exe", ["/c", "npm", "run", "dev"], frontendDir, "Frontend");
