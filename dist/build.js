#!/usr/bin/env node

// build.ts
import { Listr } from "listr2";
import * as fs from "fs";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";
import { promisify } from "util";
import * as path from "path";

// src/global.css
var global_default = 'body {\r\n  padding-top: 2%;\r\n  padding-left: 20%;\r\n  padding-right: 20%;\r\n  font-size: 1.05em;\r\n  font-family: "Sarabun", sans-serif;\r\n}\r\n@media screen and (max-width: 1000px) {\r\n  body {\r\n    padding-left: 5%;\r\n    padding-right: 5%;\r\n    font-size: 1.7em;\r\n  }\r\n}\r\nbutton,\r\ntextarea {\r\n  font-size: 1.05em;\r\n  font-family: "Sarabun", sans-serif;\r\n}\r\ntable {\r\n  font-size: 1em;\r\n  min-width: 50%;\r\n}\r\ntable,\r\nth,\r\ntd {\r\n  padding: 10px;\r\n  border: 1px solid black;\r\n  border-collapse: collapse;\r\n}\r\n.twodivs,\r\n.submitbox {\r\n  display: flex;\r\n  flex-direction: row;\r\n  justify-content: center;\r\n}\r\n.twodivs > div {\r\n  width: 50%;\r\n}\r\n.textdiv {\r\n  display: flex;\r\n  flex-direction: column;\r\n  align-items: center;\r\n}\r\n.textdiv > textarea {\r\n  width: 100%;\r\n  box-sizing: border-box;\r\n  resize: none;\r\n}\r\n.head-mono {\r\n  font-weight: 500;\r\n  font-family: "Inconsolata", "Sarabun", sans-serif;\r\n  color: gray;\r\n  text-align: right;\r\n  margin-bottom: 0.2em;\r\n  margin-top: 0.2em;\r\n}\r\n#content {\r\n  padding-top: 0.2em;\r\n  /* text-align: center; */\r\n}\r\n#maintable {\r\n  width: 100%;\r\n}\r\n';

// src/template-index.html
var template_index_default = '<!DOCTYPE html>\r\n\r\n<html>\r\n  <head>\r\n    <meta charset="utf-8" />\r\n    <link rel="stylesheet" href="./global.css" />\r\n    <link rel="preconnect" href="https://fonts.googleapis.com" />\r\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\r\n    <link\r\n      href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@500&family=Sarabun:wght@400;700&display=swap"\r\n      rel="stylesheet"\r\n    />\r\n  </head>\r\n  <body>\r\n    <div id="root">\r\n      <div class="fragment">\r\n        <header>\r\n          <h1 class="head-mono">Generated Tasks</h1>\r\n          <h3 class="head-mono">\r\n            Generated by task-pdf-writer-v2, at <span id="gendate"></span>\r\n          </h3>\r\n          <p id="content"></p>\r\n        </header>\r\n        <main>\r\n          <table id="maintable">\r\n            <thead>\r\n              <tr>\r\n                <th>Task</th>\r\n                <th>Date</th>\r\n              </tr>\r\n            </thead>\r\n            <tbody id="tablebody"></tbody>\r\n          </table>\r\n        </main>\r\n      </div>\r\n    </div>\r\n  </body>\r\n</html>\r\n';

// build.ts
process.env.BIN_SCRIPT = "true";
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
        fs.writeFileSync("./public/global.css", global_default);
      }
    },
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
        const dom = new JSDOM(template_index_default);
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
              )}?now=${Date.now()}">${taskName.replace(".md", "")}</a>`
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
