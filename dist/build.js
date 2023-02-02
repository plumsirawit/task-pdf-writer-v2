// build.ts
import { Listr } from "listr2";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";
import { promisify } from "util";
import * as path from "path";
process.env.BIN_SCRIPT = "true";
var TEMPLATE_INDEX = fs.readFileSync("./src/template-index.html").toString();
var getFormattedDate = () => {
  const date = /* @__PURE__ */ new Date();
  return date.toDateString() + " " + date.toTimeString();
};
var markdownPath = process.argv[2] ?? process.env.MARKDOWN_PATH;
var inputDir = path.resolve(markdownPath);
var taskList = fs.readdirSync(inputDir).filter((taskName) => path.extname(taskName) === ".md");
var config = JSON.parse(
  fs.readFileSync(path.join(inputDir, "config.json")).toString("utf8")
);
console.log(config);
var tasks = new Listr(
  [
    {
      title: "Prepare public directory",
      task: () => {
        fs.rmSync("public", {
          recursive: true,
          force: true
        });
        fs.mkdirSync("public");
        fs.mkdirSync(path.join("public", "tasks"));
      }
    },
    {
      title: "Prepare static global.css",
      task: () => {
        fs.copyFileSync("./src/global.css", "./public/global.css");
      }
    },
    // {
    //   title: "Bundle global.ts",
    //   task: () => {
    //     esbuild.buildSync({
    //       entryPoints: ["./src/global.ts"],
    //       bundle: true,
    //       outfile: "public/global.js",
    //       globalName: "bundle",
    //       minify: true,
    //     });
    //   },
    // },
    {
      title: "Convert markdown to PDF",
      task: async (_, task) => {
        const jobs = [];
        taskList.forEach((taskName) => {
          jobs.push({
            title: `Convert ${taskName} to PDF`,
            task: () => promisify(fs.readFile)(path.join(inputDir, taskName)).then((taskBuffer) => taskBuffer.toString("utf8")).then(
              (taskContent) => fetch(
                "https://973i5k6wjg.execute-api.ap-southeast-1.amazonaws.com/dev/genpdf",
                {
                  body: JSON.stringify({
                    ...config,
                    content: taskContent,
                    task_name: taskName.split(".")[0]
                  }),
                  method: "post"
                }
              )
            ).then((resp) => {
              console.log(resp);
              return resp.json();
            }).then((respJson) => {
              return promisify(fs.writeFile)(
                path.join(
                  "public",
                  "tasks",
                  taskName.replace(".md", ".pdf")
                ),
                Buffer.from(respJson.message, "base64")
              );
            })
          });
        });
        return task.newListr(jobs, {
          concurrent: true,
          rendererOptions: { collapse: false }
        });
      }
    },
    {
      title: "Generate static index.html",
      task: async () => {
        const dom = new JSDOM(TEMPLATE_INDEX);
        const { document } = dom.window;
        const dateSpan = document.getElementById("gendate");
        if (dateSpan) {
          dateSpan.innerHTML = getFormattedDate();
        }
        const createTd = (text) => {
          const td = document.createElement("td");
          td.innerHTML = text;
          return td;
        };
        const tableBody = document.getElementById("tablebody");
        taskList.forEach((taskName) => {
          const tr = document.createElement("tr");
          tr.appendChild(
            createTd(
              `<a href="tasks/${taskName.replace(
                ".md",
                ".pdf"
              )}">${taskName.replace(".md", "")}</a>`
            )
          );
          tr.appendChild(createTd(getFormattedDate()));
          tableBody == null ? void 0 : tableBody.appendChild(tr);
        });
        fs.writeFileSync(`./public/index.html`, dom.serialize());
      }
    }
  ],
  { concurrent: false }
);
try {
  tasks.run();
} catch (err) {
  console.error(err);
}
