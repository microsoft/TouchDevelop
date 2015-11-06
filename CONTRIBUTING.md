![](https://az31353.vo.msecnd.net/c04/uxoj.png)

# Contributing

TouchDevelop is currently accepting contributions in the form of bug fixes, features or design changes.

## Contributing bug fixes
A bug must have an issue tracking it in the issue tracker that has been approved ("Milestone == Community") by the TouchDevelop team. Your pull request should include a link to the bug that you are fixing. If you've submitted a PR for a bug, please post a comment in the bug clearly stating that you've done so, to save anyone else doing it as well.

## Contributing features or design changes
Features or design changes (things that add new or improved functionality to TouchDevelop) may be accepted, but will need to first be approved (marked as "Milestone == Community" by a TouchDevelop coordinator with the message "Approved") in the suggestion issue.

## Legal

Before we can accept your pull-request you'll need to sign a [Contribution License Agreement (CLA)](http://en.wikipedia.org/wiki/Contributor_License_Agreement). 
You can download ours [here](https://www.codeplex.com/Download?ProjectName=typescript&DownloadId=921298).

**However, you don't have to do this up-front. You can simply clone, fork, and submit your pull-request as usual.**

When your pull-request is created, we classify it. If the change is trivial, i.e. you just fixed a typo, then the PR is labelled with ``cla-not-required``. 
Otherwise it's classified as ``cla-required``. In that case, the system will also also tell you how you can sign the CLA. 
	Once you signed a CLA, the current and all future pull-requests will be labelled as cla-signed.

Signing the CLA might sound scary but it's actually super simple and can be done in less than a minute.

## Housekeeping
Your pull request should:

* Include a description of what your change intends to do
* Be a child commit of a reasonably recent commit in the **master** branch
    * Requests need not be a single commit, but should be a linear sequence of commits (i.e. no merge commits in your PR)
* It is desirable, but not necessary, for the tests to pass at each commit
* Have clear commit messages
    * e.g. "Refactor feature", "Fix issue", "Add tests for issue"
* Follow the TypeScript code conventions descriped in [Coding guidlines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidlines)
* To avoid line ending issues, set `autocrlf = input` and `whitespace = cr-at-eol` in your git configuration
