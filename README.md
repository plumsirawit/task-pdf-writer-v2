# task-pdf-writer-v2

![](https://raw.githubusercontent.com/plumsirawit/task-pdf-writer-v2/main/src/task-pdf-writer-v2-banner.svg)

The second version of task-pdf-writer.

## Basic Usage

To work in a local directory `DIRNAME`. Make sure that it contains `prob1.md`, `prob2.md`, ..., and `config.json`. Then, run `npx task-pdf-writer-v2 DIRNAME`, this will create a `./public` directory under the current working directory.

## Intended Usage

The second version, in contrast to the first version, is not a platform (and will not be a platform anymore). You are expected to write task statements within your own management system (maybe locally, or using git, etc.). The tool will just only generate corresponding PDF files (and also HTML to make it very easy for hosting).

This is a bit more technical, and more "low-level", compared to the first version. The reason behind this is because nowadays we're using [microservices](https://en.wikipedia.org/wiki/Microservices) everywhere, and everyone hates [coupling](<https://en.wikipedia.org/wiki/Coupling_(computer_programming)>). This is 2023 now, not 2015 anymore, where we'd love platform-based architectural design.

So, the most basic typical setup processs would be the following:

1. Create a repository (probably private except you want others to know your tasks).
2. Put your tasks (in Markdown) inside a directory in the repository.
3. Write `config.json`, the format should be the same as in [config.json of this repository](https://github.com/plumsirawit/task-pdf-writer-v2/blob/main/examples/contest1/config.json).
4. Setup an automated hosting (I normally use Netlify, but I think anything is fine), with the build command `npx task-pdf-writer-v2 DIRNAME` where `DIRNAME` stands for the contest directory.
5. (Optional, but probably very important for practical uses) Setup a strong authentication system in front of the hosted website. (For Netlify, "Site protection" should be enabled. For self-hosting, maybe use `nginx` as a front webserver and maybe use HTTP Basic access authentication, at the minimum. Otherwise, firewall and IP protection would be ideal.)
