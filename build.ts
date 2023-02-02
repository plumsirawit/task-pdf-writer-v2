#!/usr/bin/env node

process.env.BIN_SCRIPT = "true";
import { Listr, ListrTask } from "listr2";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";
import { promisify } from "util";
import * as path from "path";
import globalCSS from "./src/global.css"; // text content
import TEMPLATE_INDEX from "./src/template-index.html"; // text content

const getFormattedDate = () => {
  const date = new Date();
  return date.toDateString() + " " + date.toTimeString();
};

const markdownPath = process.argv[2] ?? process.env.MARKDOWN_PATH;

const inputDir = path.resolve(markdownPath);
const taskList = fs
  .readdirSync(inputDir)
  .filter((taskName) => path.extname(taskName) === ".md");
const config = JSON.parse(
  fs.readFileSync(path.join(inputDir, "config.json")).toString("utf8")
);

const tasks = new Listr(
  [
    {
      title: "Prepare public directory",
      task: () => {
        fs.rmSync("public", {
          recursive: true,
          force: true,
        });
        fs.mkdirSync("public");
        fs.mkdirSync(path.join("public", "tasks"));
      },
    },
    {
      title: "Prepare static global.css",
      task: () => {
        fs.writeFileSync("./public/global.css", globalCSS);
      },
    },
    {
      title: "Convert markdown to PDF",
      task: async (_, task) => {
        const jobs: ListrTask<any>[] = [];
        taskList.forEach((taskName) => {
          jobs.push({
            title: `Convert ${taskName} to PDF`,
            task: () =>
              promisify(fs.readFile)(path.join(inputDir, taskName))
                .then((taskBuffer) => taskBuffer.toString("utf8"))
                .then((taskContent) =>
                  fetch(
                    "https://973i5k6wjg.execute-api.ap-southeast-1.amazonaws.com/dev/genpdf",
                    {
                      body: JSON.stringify({
                        ...config,
                        content: taskContent,
                        task_name: taskName.split(".")[0],
                      }),
                      method: "post",
                    }
                  )
                )
                .then((resp) => {
                  return resp.json() as Promise<Record<string, string>>;
                })
                .then((respJson: Record<string, string>) => {
                  return promisify(fs.writeFile)(
                    path.join(
                      "public",
                      "tasks",
                      taskName.replace(".md", ".pdf")
                    ),
                    Buffer.from(respJson.message, "base64")
                  );
                }),
          });
        });
        return task.newListr(jobs, {
          concurrent: true,
          rendererOptions: { collapse: false },
        });
      },
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
        const createTd = (text: string) => {
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
              )}?now=${Date.now()}">${taskName.replace(".md", "")}</a>`
            )
          );
          tr.appendChild(createTd(getFormattedDate()));
          tableBody?.appendChild(tr);
        });
        fs.writeFileSync(`./public/index.html`, dom.serialize());
      },
    },
  ],
  { concurrent: false }
);

try {
  tasks.run();
} catch (err) {
  console.error(err);
}
