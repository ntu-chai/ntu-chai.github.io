# Maintainer Workflow Notes

These notes are kept for historical reference. They describe personal helper
commands and an older mirror workflow that are not required for normal site
editing.

For the current project-neutral workflow, use the root [README.md](../README.md).

## Personal Shell Helpers

Some maintainers may have local shell helpers similar to these in their shell
profile. They are optional and machine-specific.

```bash
alias chai-cd='cd /Users/amberber/Githubs/CHAI/ntu-chai.github.io'

chai-sync() {
  cd /Users/amberber/Githubs/CHAI/ntu-chai.github.io || return 1
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$branch" != "main" ]]; then
    echo "chai-sync only runs from main. You are on: $branch"
    echo "Switch first: git checkout main"
    return 1
  fi
  git add . \
    && git commit -m "${1:-Update CHAI homepage}" \
    && git pull --rebase origin main \
    && git push origin main
}
```

Equivalent manual commands:

```bash
git add .
git commit -m "Update CHAI site"
git pull --rebase origin main
git push origin main
```

## Legacy Mirror Workflow

This workflow dates from when `chai-site-v2` was a private source repository
and changes had to be mirrored into `ntu-chai.github.io`. The current workflow
is simpler: edit `ntu-chai.github.io` directly and push to `main`.

Historical repository roles:

- `chai-site-v2`: private working/source repository.
- `ntu-chai.github.io`: shared public homepage repository.

Historical source-site update:

```bash
cd /Users/amberber/Githubs/CHAI/chai-site-v2
git pull --rebase origin main

# edit files, then preview locally
git status
git add .
git commit -m "Update CHAI site"
git push origin main
```

Copy the commit hash:

```bash
git log --oneline -n 5
```

Then apply that commit to the public homepage repository:

```bash
cd /Users/amberber/Githubs/CHAI/ntu-chai.github.io
git pull --rebase origin main

git remote add source-v2 https://github.com/ntu-chai/chai-site-v2.git
git fetch source-v2
git cherry-pick YOUR_COMMIT_HASH
git push origin main
```

If `source-v2` already exists:

```bash
git remote set-url source-v2 https://github.com/ntu-chai/chai-site-v2.git
git fetch source-v2
git cherry-pick YOUR_COMMIT_HASH
git push origin main
```

## Legacy rsync Mirror

This was another old mirror approach and should not be used for ordinary edits.

```bash
cd /Users/amberber/Githubs/CHAI
rsync -av --delete --exclude='.git' --exclude='.DS_Store' --exclude='trip2026/' chai-site-v2/ ntu-chai.github.io/

cd ntu-chai.github.io
git add .
git commit -m "Update CHAI homepage"
git pull --rebase origin main
git push origin main
```

Pulling `ntu-chai.github.io` before `rsync --delete` was important in that old
workflow because it protected folders collaborators added to the homepage repo,
such as `trip2026/`, from being deleted by an out-of-date local clone.
