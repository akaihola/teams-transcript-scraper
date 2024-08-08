# Developer Guide

## Setting up Git Hooks

To ensure that the bookmarklet and user script are automatically updated whenever `scraper.js` is modified, you need to set up a Git pre-commit hook. Follow these steps in the root of the repository:

1. Make the setup script executable:
   ```bash
   chmod +x setup_git_hooks.sh
   ```

2. Run the setup script:
   ```bash
   ./setup_git_hooks.sh
   ```

This will create the necessary pre-commit hook that runs `update_scripts.sh` whenever `scraper.js` is committed.

Note: Make sure `update_scripts.sh` is also executable. If it's not, run:
```bash
chmod +x update_scripts.sh
```

After completing these steps, the pre-commit hook will be activated and will run automatically on each commit.
