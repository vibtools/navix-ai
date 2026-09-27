# Contributing to Navix AI

First off, thank you for considering contributing to Navix AI! It's people like you that make Navix AI such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make one! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

## Fork & create a branch

If this is something you think you can fix, then fork Navix AI and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-add-ollama-support
```

## Implement your fix or feature

At this point, you're ready to make your changes. Feel free to ask for help; everyone is a beginner at first :smile_cat:

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with Navix AI's master branch:

```sh
git remote add upstream https://github.com/victorsteele/navix-ai.git
git checkout master
git pull upstream master
```

Then update your feature branch from your local copy of master, and push it!

```sh
git checkout 325-add-ollama-support
git rebase master
git push --set-upstream origin 325-add-ollama-support
```

Finally, go to GitHub and make a Pull Request :D

---

## 🏢 About the Author & Company

**Navix AI** is an open-source project by **[Vib Tools](https://vib.tools/)**, a software organization building practical desktop applications, automation tooling, and developer utilities for real workflows.

- **Author / Maintainer:** Md Nurnobi ([@victorsteele](https://github.com/victorsteele))
- **Company:** Vib Tools
- **Website:** [vib.tools](https://vib.tools/)
- **GitHub Organization:** [@vibtools](https://github.com/vibtools)
- **Email:** hello@vib.tools
- **Location:** 5660 Kochakata, Nageswari, Kurigram, Rangpur, Bangladesh
