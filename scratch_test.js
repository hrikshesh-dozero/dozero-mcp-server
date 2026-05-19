import { EventEmitter } from "node:events";
import { authStorage } from "./src/convex.js";

const emitter = new EventEmitter();

emitter.on("message", () => {
  console.log("EventEmitter context:", authStorage.getStore());
});

async function run() {
  await authStorage.run({ token: "emitter-token" }, async () => {
    console.log("Before emit:", authStorage.getStore());
    emitter.emit("message");
    
    // Simulate async emit
    await new Promise((resolve) => {
      setImmediate(() => {
        emitter.emit("message");
        resolve();
      });
    });
  });
}

run();
