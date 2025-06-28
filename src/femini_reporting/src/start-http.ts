import { server } from "./base";

server.start({
  transportType: "httpStream",
  httpStream: {
    port: 3002,
    endpoint: "/stream",
  },
});
