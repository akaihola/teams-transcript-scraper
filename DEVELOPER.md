# Developer Guide

## Setting up Git Hooks

To ensure that the bookmarklet is automatically updated whenever `scraper.js` is modified, you need to set up the Git pre-commit hook. Run the following command in the root of the repository:

```bash
./setup_git_hooks.sh
```

This will create the necessary pre-commit hook that runs `create_bookmarklet.sh` whenever `scraper.js` is committed.
