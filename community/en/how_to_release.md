---
title: How to Release
---

<font style="color:rgb(0, 0, 0);">This document outlines the process for a release manager to publish a new version of Apache Geaflow.</font>

## Introduction

<font style="color:rgb(0, 0, 0);">Source Release is a critical process at Apache, emphasizing compliance with licensing and signing requirements. Releasing software carries legal implications, so careful attention is essential.</font>

## First-time as a release manager

### Environmental requirements

This release process is operated in the Ubuntu OS, and the following tools are required:

- JDK 1.8
- Apache Maven 3.x
- Python 3.8
- GnuPG 2.x
- Git
- SVN (apache uses svn to host project releases)
- Pay attention to setting environment variables: if you configure gpg keys under a different directory,  
  please `export GNUPGHOME=$(xxx)`

### Prepare GPG Key

If you are the first to become a release manager, you need to prepare a gpg key.

Following is a quick setup, you can refer to [Apache openpgp doc](https://infra.apache.org/openpgp.html) for further  
details.

#### Install GPG

```bash
sudo apt install gnupg2
```

#### Generate GPG Key

Please use your apache name and email for generate key

```bash
$ gpg --full-gen-key
gpg (GnuPG) 2.2.20; Copyright (C) 2020 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Please select what kind of key you want:
   (1) RSA and RSA (default)
   (2) DSA and Elgamal
   (3) DSA (sign only)
   (4) RSA (sign only)
  (14) Existing key from card
Your selection? 1 # input 1
RSA keys may be between 1024 and 4096 bits long.
What keysize do you want? (2048) 4096 # input 4096
Requested keysize is 4096 bits
Please specify how long the key should be valid.
         0 = key does not expire
      <n>  = key expires in n days
      <n>w = key expires in n weeks
      <n>m = key expires in n months
      <n>y = key expires in n years
Key is valid for? (0) 0 # input 0
Key does not expire at all
Is this correct? (y/N) y # input y

GnuPG needs to construct a user ID to identify your key.

Real name: Chaokun Yang                   # input your name
Email address: chaokunyang@apache.org     # input your email
Comment: CODE SIGNING KEY                 # input some annotations, optional
You selected this USER-ID:
    "Chaokun <chaokunyang@apache.org>"

Change (N)ame, (C)omment, (E)mail or (O)kay/(Q)uit? O # input O
We need to generate a lot of random bytes. It is a good idea to perform
some other action (type on the keyboard, move the mouse, utilize the
disks) during the prime generation; this gives the random number
generator a better chance to gain enough entropy.
We need to generate a lot of random bytes. It is a good idea to perform
some other action (type on the keyboard, move the mouse, utilize the
disks) during the prime generation; this gives the random number
generator a better chance to gain enough entropy.

# Input the security key
┌──────────────────────────────────────────────────────┐
│ Please enter this passphrase                         │
│                                                      │
│ Passphrase: _______________________________          │
│                                                      │
│       <OK>                              <Cancel>     │
└──────────────────────────────────────────────────────┘
# key generation will be done after your inputting the key with the following output
gpg: key E49B00F626B marked as ultimately trusted
gpg: revocation certificate stored as '/Users/chaokunyang/.gnupg/openpgp-revocs.d/1E2CDAE4C08AD7D694D1CB139D7BE8E45E580BA4.rev'
public and secret key created and signed.

pub   rsa4096 2022-07-12 [SC]
      1E2CDAE4C08AD7D694D1CB139D7BE8E45E580BA4
uid           [ultimate] Chaokun <chaokunyang@apache.org>
sub   rsa4096 2022-07-12 [E]
```

#### Upload your public key to public GPG keyserver

Firstly, list your key:

```bash
gpg --list-keys
```

The output is like:

```bash
--------------------------------------------------
pub   rsa4096 2024-03-27 [SC]
      1E2CDAE4C08AD7D694D1CB139D7BE8E45E580BA4
uid           [ultimate] chaokunyang (CODE SIGNING KEY) <chaokunyang@apache.org>
sub   rsa4096 2024-03-27 [E]
```

Then, send your key id to key server:

```bash
gpg --keyserver keys.openpgp.org --send-key <key-id> # e.g., 1E2CDAE4C08AD7D694D1CB139D7BE8E45E580BA4
```

Among them, `keys.openpgp.org` is a randomly selected keyserver, you can use keyserver.ubuntu.com or any other  
full-featured keyserver.

#### Check whether the key is created successfully

Uploading takes about one minute; after that, you can check by email at the corresponding keyserver.

Uploading keys to the keyserver is mainly for joining  
a [Web of Trust](https://infra.apache.org/release-signing.html#web-of-trust).

#### Add your GPG public key to the project KEYS file

The svn repository of the release branch is: https://dist.apache.org/repos/dist/release/geaflow

Please add the public key to KEYS in the release branch:

```bash
svn co https://dist.apache.org/repos/dist/release/Geaflow Geaflow-dist
# As this step will copy all the versions, it will take some time. If the network is broken, please use svn cleanup to delete the lock before re-execute it.
cd Geaflow-dist
(gpg --list-sigs YOUR_NAME@apache.org && gpg --export --armor YOUR_NAME@apache.org) >> KEYS # Append your key to the KEYS file
svn add .   # It is not needed if the KEYS document exists before.
svn ci -m "add gpg key for YOUR_NAME" # Later on, if you are asked to enter a username and password, just use your apache username and password.
```

#### Upload the GPG public key to your GitHub account

- Enter [https://github.com/settings/keys](https://github.com/settings/keys) to add your GPG key.
- Please remember to bind the email address used in the GPG key to your GitHub  
  account ([https://github.com/settings/emails](https://github.com/settings/emails)) if you find "unverified" after adding it.

### Further reading

It's recommended but not mandatory to read following documents before making a release to know more details about apache  
release:

- Release policy: [https://www.apache.org/legal/release-policy.html](https://www.apache.org/legal/release-policy.html)
- TLP release: [https://infra.apache.org/release-distribution](https://infra.apache.org/release-distribution)
- Release sign: [https://infra.apache.org/release-signing.html](https://infra.apache.org/release-signing.html)
- Release publish: [https://infra.apache.org/release-publishing.html](https://infra.apache.org/release-publishing.html)
- Release download pages: [https://infra.apache.org/release-download-pages.html](https://infra.apache.org/release-download-pages.html)
- Publishing maven artifacts: [https://infra.apache.org/publishing-maven-artifacts.html](https://infra.apache.org/publishing-maven-artifacts.html)

## Start discussion about the release

Start a discussion about the next release via sending email to: dev@Geaflow.apache.org:

Title:

```plain
[DISCUSS] Release Apache Geaflow ${release_version}
```

Content:

```plain
Hello, Apache Geaflow Community,

This is a call for a discussion to release Apache Geaflow version ${release_version}.

The change lists about this release:

https://github.com/apache/Geaflow/compare/v0.12.0...v0.12.1-rc1

Please leave your comments here about this release plan. We will bump the version in repo and start the release process after the discussion.

Thanks,

${name}
```

## Preparing for release

If the discussion goes positive, you will need to prepare the release artifiacts.

### Github branch and tag

- Create a new branch named `releases-0.12.0`
- Bump version to `$version` by executing command `python ci/release.py bump_version -l all -version $version`
- Make a git commit and push the branch to `git@github.com:apache/Geaflow.git`
- Create a new tag by `git tag v0.12.0-rc1`, then push it to `git@github.com:apache/Geaflow.git`

### Build and upload artifacts to SVN dist/dev repo

First you need to build source release artifacts by `python ci/release.py build -v $version`.

Then you need to upload it to svn dist repo. The dist repo of the dev branch  
is: [https://dist.apache.org/repos/dist/dev/Geaflow](https://dist.apache.org/repos/dist/dev/fory)

```bash
# As this step will copy all the versions, it will take some time. If the network is broken, please use svn cleanup to delete the lock before re-execute it.
svn co https://dist.apache.org/repos/dist/dev/Geaflow Geaflow-dist-dev
```

Then, upload the artifacts:

```bash
cd Geaflow-dist-dev
# create a directory named by version
mkdir ${release_version}-${rc_version}
# copy source code and signature package to the versioned directory
cp ${repo_dir}/dist/* ${release_version}-${rc_version}
# check svn status
svn status
# add to svn
svn add ${release_version}-${rc_version}
# check svn status
svn status
# commit to SVN remote server
svn commit -m "Prepare for Geaflow ${release_version}-${rc_version}"
```

Visit [https://dist.apache.org/repos/dist/dev/Geaflow/](https://dist.apache.org/repos/dist/dev/fory/) to check the artifacts are uploaded correctly.

### What to do if something goes wrong

If some files are unexpected, you need to remove by `svn delete` and repeat the above upload process.

## Voting

### check version

Geaflow requires votes from the Geaflow Community.

- release_version: the version for Geaflow, like 0.12.0.
- release_candidate_version: the version for voting, like 0.12.0-rc1.
- maven_artifact_number: the number for Maven staging artifacts, like 1001. Specifically, the maven_artifact_number can  
  be found by searching "Geaflow" on https://repository.apache.org/#stagingRepositories.

### Build the source code of Geaflow and release it to font>

#### Configure Apache Account Passwords

Before publishing Geaflow to Nexus, you need to securely configure your Apache account credentials. This step is critical as passwords must be encrypted.

First, open your Maven global settings file `settings.xml`, typically located at `~/.m2/settings.xml`. Add or modify the  
following section:

```xml

<servers>
    <server>
        <id>apache.snapshots.https</id>
        <username>your-apache-username</username>
        <password>{your-encrypted-password}</password>
    </server>
    <server>
        <id>apache.releases.https</id>
        <username>your-apache-username</username>
        <password>{your-encrypted-password}</password>
    </server>
</servers>

```

**Important Notes:**

- Replace `your-apache-username` with your Apache LDAP username
- Passwords must be encrypted using Maven's password encryption tool
- Encrypted passwords should be enclosed in curly braces `{}`

Refer to the official documentation for detailed encryption  
instructions: [Publishing Maven Artifacts](https://infra.apache.org/publishing-maven-artifacts.html)

Steps to encrypt your password:

1. Generate a master password (if you haven't already):

```shell

mvn --encrypt-master-password your-master-password

```

Save the output to `~/.m2/settings-security.xml`:

```xml

<settingsSecurity>
    <master>{your-encrypted-master-password}</master>
</settingsSecurity>

```

2. Encrypt your Apache account password:

```shell

mvn --encrypt-password your-apache-password

```

Place the encrypted output into the `password` field in `settings.xml`

#### Build and Publish Java Module

```shell

# Navigate to the Java module directory
cd java

# Execute Maven build and deploy to Nexus
# -T10: Use 10 threads for parallel build, improving speed
# clean: Clean the project
# deploy: Deploy to remote repository
# -Papache-release: Activate apache-release profile
# -DskipTests: Skip tests
# -Dgpg.skip=false: Enable GPG signing (required for release verification)
mvn -T10 clean deploy -Papache-release -DskipTests -Dgpg.skip=false

```

#### Build and Publish Kotlin Module

```shell

# Return to project root and navigate to Kotlin module
cd ../kotlin

# Execute the same Maven command as Java module
# Configuration parameters are identical to Java module
mvn -T10 clean deploy -Papache-release -DskipTests -Dgpg.skip=false

```

#### Build and Publish Scala Module

```shell

# Return to project root and navigate to Scala module
cd ../scala

# Build and sign JARs for all Scala versions
# +publishSigned: Execute publishSigned for all configured Scala versions
echo "Starting to build Scala JARs..."
sbt +publishSigned

# Prepare for upload to Sonatype (Nexus)
# sonatypePrepare: Prepare for Maven Central Repository release
echo "Starting upload preparation..."
sbt sonatypePrepare

# Upload packaged JARs to Sonatype
# sonatypeBundleUpload: Upload prepared bundles
echo "Starting JAR upload..."
sbt sonatypeBundleUpload

echo "Scala JAR deployment succeeded!"

```

#### Lock the Release in Nexus

After completing the publication of all modules, perform the following steps in Nexus:

1. Log in to the Apache Nexus repository management interface
2. Navigate to the "Snapshots" or "Releases" repository (depending on your release type)
3. Locate the latest Geaflow project version
4. Execute the "Close" operation to validate all uploaded artifacts
5. After successful validation, execute the "Release" operation to finalize the deployment

These steps ensure all published artifacts are verified and correctly deployed to the public repository.

### build a Pre-release

You need to build a Pre-release before voting, such as:  
[https://github.com/apache/Geaflow/releases/tag/v0.12.0-rc1](https://github.com/apache/fory/releases/tag/v0.12.0-rc1)

### Geaflow Community Vote（可选）

you need send a email to Geaflow Community: dev@Geaflow.apache.org:

Title:

```plain
[VOTE] Release Apache Geaflow v${release_version}-${rc_version}
```

Content:

```plain
Hello, Apache Geaflow Community:

This is a call for vote to release Apache Geaflow
version release-${release_version}-${rc_version}.

Apache Geaflow - A blazingly fast multi-language serialization
framework powered by JIT and zero-copy.

The discussion thread:
https://lists.apache.org/thread/xxr3od301g6v3ndj14zqc05byp9qvclh

The change lists about this release:
https://github.com/apache/Geaflow/compare/v0.12.0...v0.12.1-rc1

The release candidates:
https://dist.apache.org/repos/dist/dev/Geaflow/0.5.0-rc3/

The maven staging for this release:
https://repository.apache.org/content/repositories/orgapacheGeaflow-1003

Git tag for the release:
https://github.com/apache/Geaflow/releases/tag/v0.12.0-rc1

Git commit for the release:
https://github.com/apache/Geaflow/commit/fae06330edd049bb960536e978a45b97bca66faf

The artifacts signed with PGP key [5E580BA4], corresponding to
[chaokunyang@apache.org], that can be found in keys file:
https://downloads.apache.org/Geaflow/KEYS

The vote will be open for at least 72 hours until the necessary number of votes are reached.

Please vote accordingly:

[ ] +1 approve
[ ] +0 no opinion
[ ] -1 disapprove with the reason

To learn more about Geaflow, please see https://Geaflow.apache.org/

*Valid check is a requirement for a vote. *Checklist for reference:

[ ] Download Geaflow is valid.
[ ] Checksums and PGP signatures are valid.
[ ] Source code distributions have correct names matching the current release.
[ ] LICENSE and NOTICE files are correct.
[ ] All files have license headers if necessary.
[ ] No compiled archives bundled in source archive.
[ ] Can compile from source.

How to Build and Test, please refer to: https://github.com/apache/Geaflow/blob/main/docs/guide/DEVELOPMENT.md


Thanks,
${name}
```

After at least 3 +1 binding vote (from Geaflow Podling PMC member and committers) and no veto,  
first, reply to the above voting thread to notify that the voting has ended.

```plain
Hi all,

The vote for Release Apache Geaflow v${release_version}-${rc_version} is closed now.

Thanks to everyone for helping checking and voting for the release.

I will close the vote later in another thread.

Best,
${name}
```

Immediately afterward, launch a new voting thread to claim the voting results.

Title:

```plain
[RESULT][VOTE] Release Apache Geaflow v${release_version}-${rc_version}
```

Content:

```plain
Hello, Apache Geaflow Community,

The vote to release Apache Geaflow v${release_version}-${rc_version} has passed.

The vote PASSED with 3 binding +1 and 0 -1 vote:

Binding votes:

- xxx
- yyy
- zzz

Vote thread: ${vote_thread_url}

Thanks,

${name}
```

### What if vote fail

If the vote failed, click "Drop" to drop the staging Maven artifacts.

Address the raised issues, then bump `rc_version` and file a new vote again.

## Official Release

### Publish artifacts to SVN Release Directory

- release_version: the release version for Geaflow, like 0.5.0
- release_candidate_version: the version for voting, like 0.5.0-rc1

```bash
svn mv https://dist.apache.org/repos/dist/dev/Geaflow/${release_version}-${rc_version} https://dist.apache.org/repos/dist/release/Geaflow/${release_version} -m "Release Geaflow ${release_version}"
```

In the repository at [https://dist.apache.org/repos/dist/dev/Geaflow/](https://dist.apache.org/repos/dist/dev/fory/), if any  
outdated release_candidate_version are left behind when releasing the release_version,  
please clear them to keep the dev repository tidy.

When `https://archive.apache.org/dist/Geaflow/0.12.0/${release_version}` is  
accessible (confirming that the release_version has been successfully released  
and archived), we may clean up the previous release version in the release repository,  
leaving only the current version.

### Update Geaflow&Geaflow-Site content

Submit a PR to [https://github.com/apache/Geaflow-site](https://github.com/apache/fory-site) to update Geaflow-site.  
Reference implementation: [#283](https://github.com/apache/fory-site/pull/283)  
and [#285](https://github.com/apache/fory-site/pull/285).

#### Update Geaflow-Site

In general, the following two key areas need to be modified:

1. Write a new announcement, for example:  
   Add a new markdown file under the blog folder:

```plain
The Apache Geaflow team is pleased to announce the [?] release. This is a major release that includes [? PR](https://github.com/apache/Geaflow/compare/v[?]...v[?]) from ? distinct contributors. See the [Install](https://Geaflow.apache.org/docs/docs/start/install) Page to learn how to get the libraries for your platform.
```

2. Replace versions by upgrading old versions to new ones.  
   For example, in [install](https://fory.apache.org/docs/docs/start/install/#java) section, it is necessary to update the documentation for both the development branch and the latest release branch::

```plain
<dependency>
 <groupId>org.apache.Geaflow</groupId>
 <artifactId>Geaflow-core</artifactId>
 <version>0.11.2</version>
</dependency>

```

#### Update Geaflow

Submit a PR to [https://github.com/apache/fury](https://github.com/apache/fury) to update [README](https://github.com/apache/fury/blob/main/README.md),  
like [#2207](https://github.com/apache/fury/pull/2207).

### Github officially released

You need to officially release this version in the Geaflow project  
Reference implementation: [https://github.com/apache/Geaflow/releases/tag/v0.12.0](https://github.com/apache/fory/releases/tag/v0.12.0)

### Release Maven artifacts

- maven_artifact_number: the number for Maven staging artifacts, like 1001.
- Open [https://repository.apache.org/#stagingRepositories](https://repository.apache.org/#stagingRepositories).
- Find the artifact `orgapacheGeaflow-${maven_artifact_number}`, click "Release".

### Send the announcement

Send the release announcement to dev@Geaflow.apache.org and CC announce@apache.org.

Title:

```plain
[ANNOUNCE] Apache Geaflow ${release_version} released
```

Content:

```plain
Hi all,

The Apache Geaflow community is pleased to announce
that Apache Geaflow {release_version} has been released!

Apache Geaflow - A blazingly fast multi-language serialization
framework powered by JIT and zero-copy.

The release notes are available here:
https://github.com/apache/Geaflow/releases/tag/v${release_version}

For the complete list of changes:
https://github.com/apache/Geaflow/compare/v0.12.0...v${release_version}

Apache Geaflow website: https://Geaflow.apache.org/

Download Links: https://geaflow.apache.org/download

Geaflow Resources:
- Geaflow github repo: https://github.com/apache/geaflow
- Issue: https://github.com/apache/geaflow/issues
- Mailing list: dev@geaflow.apache.org

We are looking to grow our community and welcome new contributors. If
you are interested in contributing to Geaflow, please contact us on the
mailing list or on GitHub. We will be happy to help you get started.

------------------
Best Regards,
${your_name}
```

Remember to use plain text instead of rich text format, or you may be rejected when CC announce@apache.org .

<font style="color:rgb(0, 0, 0);">After completing these steps, the Geaflow release process is complete.</font>
