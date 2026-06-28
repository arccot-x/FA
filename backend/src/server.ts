import { app } from "./app";
import { env } from "./lib/env";

app.listen(env.PORT, () => {
  console.log(`Finance API listening on http://localhost:${env.PORT}`);
});

