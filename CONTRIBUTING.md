![](https://az31353.vo.msecnd.net/c04/uxoj.png)

# Contributing

TouchDevelop is currently accepting contributions in the form of bug fixes, features or design changes.

## Contributing bug fixes
A bug must have an issue tracking it in the issue tracker that has been approved ("Milestone == Community") by the TouchDevelop team. Your pull request should include a link to the bug that you are fixing. If you've submitted a PR for a bug, please post a comment in the bug to avoid duplication of effort.

## Contributing features or design changes
Features or design changes (things that add new or improved functionality to TouchDevelop) may be accepted, but will need to first be approved (marked as "Milestone == Community" by a TouchDevelop coordinator with the message "Approved") in the suggestion issue.

## Legal
You will need to complete a Contributor License Agreement (CLA). Briefly, this agreement testifies that you are granting us permission to use the submitted change according to the terms of the project's license, and that the work being submitted is under appropriate copyright.

Please submit a Contributor License Agreement (CLA) before submitting a pull request. Download the agreement ([Microsoft Contribution License Agreement.docx](https://www.codeplex.com/Download?ProjectName=typescript&DownloadId=822190) or [Microsoft Contribution License Agreement.pdf](https://www.codeplex.com/Download?ProjectName=typescript&DownloadId=921298)), sign, scan, and email it back to <cla@microsoft.com>. Be sure to include your github user name along with the agreement. Once we have received the signed CLA, we'll review the request. Please note that we're currently only accepting pull requests of bug fixes rather than new features.

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
