---
title: 如何发布
---

<font style="color:rgb(0, 0, 0);">本文档概述了发布管理员发布 Apache Geaflow（孵化中）新版本的流程。</font>

## 简介

<font style="color:rgb(0, 0, 0);">源码发布是 Apache 的关键流程，强调遵守许可证和签名要求。发布软件具有法律含义，因此必须谨慎对待。</font>

## 首次成为发布管理员

### <font style="background-color:#FBDE28;">环境要求</font>

此发布流程在 Ubuntu 操作系统中运行，需要以下工具：

- JDK 1.8
- Apache Maven 3.x
- Python 3.8
- GnuPG 2.x
- Git
- SVN（Apache 使用 SVN 托管项目发布）
- 注意设置环境变量：如果您在不同目录下配置 gpg 密钥，
  请执行 `export GNUPGHOME=$(xxx)`

### 准备 GPG 密钥

如果您是首次成为发布管理员，需要准备 GPG 密钥。

以下是快速设置步骤，您可以参考 [Apache openpgp 文档](https://infra.apache.org/openpgp.html) 获取更多详细信息。

#### 安装 GPG

```bash
sudo apt install gnupg2
```

#### 生成 GPG 密钥

请使用您的 Apache 名称和电子邮件生成密钥

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

#### 将公钥上传到公共 GPG 密钥服务器

首先，列出您的密钥：

```bash
gpg --list-keys
```

输出类似：

```bash
--------------------------------------------------
pub   rsa4096 2024-03-27 [SC]
      1E2CDAE4C08AD7D694D1CB139D7BE8E45E580BA4
uid           [ultimate] chaokunyang (CODE SIGNING KEY) <chaokunyang@apache.org>
sub   rsa4096 2024-03-27 [E]
```

然后，将您的密钥 ID 发送到密钥服务器：

```bash
gpg --keyserver keys.openpgp.org --send-key <key-id> # 例如，1E2CDAE4C08AD7D694D1CB139D7BE8E45E580BA4
```

其中，`keys.openpgp.org` 是随机选择的密钥服务器，您可以使用 keyserver.ubuntu.com 或任何其他功能完整的密钥服务器。

#### 检查密钥是否创建成功

上传需要约一分钟时间；之后，您可以通过相应密钥服务器上的电子邮件进行检查。

将密钥上传到密钥服务器主要是为了加入
[信任网络](https://infra.apache.org/release-signing.html#web-of-trust)。

#### 将您的 GPG 公钥添加到项目 KEYS 文件

发布分支的 SVN 仓库是：https://dist.apache.org/repos/dist/release/geaflow

请将公钥添加到发布分支的 KEYS 文件中：

```bash
svn co https://dist.apache.org/repos/dist/release/Geaflow Geaflow-dist
# As this step will copy all the versions, it will take some time. If the network is broken, please use svn cleanup to delete the lock before re-execute it.
cd Geaflow-dist
(gpg --list-sigs YOUR_NAME@apache.org && gpg --export --armor YOUR_NAME@apache.org) >> KEYS # Append your key to the KEYS file
svn add .   # It is not needed if the KEYS document exists before.
svn ci -m "add gpg key for YOUR_NAME" # Later on, if you are asked to enter a username and password, just use your apache username and password.
```

#### 将 GPG 公钥上传到您的 GitHub 账户

- 进入 [https://github.com/settings/keys](https://github.com/settings/keys) 添加您的 GPG 密钥。
- 如果添加后发现 "未验证"，请记得将 GPG 密钥中使用的电子邮件地址绑定到您的 GitHub
  账户（[https://github.com/settings/emails](https://github.com/settings/emails)）。

### 进一步阅读

在进行发布之前，建议但非必须阅读以下文档以了解有关 Apache 发布的更多详细信息：

- 发布政策：[https://www.apache.org/legal/release-policy.html](https://www.apache.org/legal/release-policy.html)
- TLP 发布：[https://infra.apache.org/release-distribution](https://infra.apache.org/release-distribution)
- 发布签名：[https://infra.apache.org/release-signing.html](https://infra.apache.org/release-signing.html)
- 发布发布：[https://infra.apache.org/release-publishing.html](https://infra.apache.org/release-publishing.html)
- 发布下载页面：[https://infra.apache.org/release-download-pages.html](https://infra.apache.org/release-download-pages.html)
- 发布 Maven 构件：[https://infra.apache.org/publishing-maven-artifacts.html](https://infra.apache.org/publishing-maven-artifacts.html)

## <font style="background-color:#FBDE28;">开始讨论发布</font>

通过发送电子邮件到 dev@Geaflow.apache.org 开始讨论下一个版本：

标题：

```plain
[DISCUSS] Release Apache Geaflow ${release_version}
```

内容：

```plain
Hello, Apache Geaflow Community,

This is a call for a discussion to release Apache Geaflow version ${release_version}.

The change lists about this release:

https://github.com/apache/Geaflow/compare/v0.12.0...v0.12.1-rc1

Please leave your comments here about this release plan. We will bump the version in repo and start the release process after the discussion.

Thanks,

${name}
```

## 准备发布

如果讨论结果积极，您需要准备发布构件。

### Github 分支和标签

- 创建一个名为 `releases-0.12.0` 的新分支
- 通过执行命令 `python ci/release.py bump_version -l all -version $version` 将版本升级到 `$version`
- 进行 git 提交并将分支推送到 `git@github.com:apache/Geaflow.git`
- 通过 `git tag v0.12.0-rc1` 创建一个新标签，然后将其推送到 `git@github.com:apache/Geaflow.git`

### 构建并上传构件到 SVN dist/dev 仓库

首先，您需要通过 `python ci/release.py build -v $version` 构建源码发布构件。

然后，您需要将其上传到 SVN dist 仓库。开发分支的 dist 仓库
是：[https://dist.apache.org/repos/dist/dev/Geaflow](https://dist.apache.org/repos/dist/dev/fory)

```bash
# As this step will copy all the versions, it will take some time. If the network is broken, please use svn cleanup to delete the lock before re-execute it.
svn co https://dist.apache.org/repos/dist/dev/Geaflow Geaflow-dist-dev
```

然后，上传构件：

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

访问 [https://dist.apache.org/repos/dist/dev/Geaflow/](https://dist.apache.org/repos/dist/dev/fory/) 检查构件是否正确上传。

### 如果出现问题怎么办

如果有意外文件，您需要通过 `svn delete` 删除它们并重复上述上传过程。

## <font style="background-color:#FBDE28;">投票</font>

### 检查版本

Geaflow 需要 Geaflow 社区的投票。

- release_version: Geaflow 的版本，如 0.12.0。
- release_candidate_version: 投票的版本，如 0.12.0-rc1。
- maven_artifact_number: Maven 暂存构件的编号，如 1001。具体来说，maven_artifact_number 可以
  通过在 https://repository.apache.org/#stagingRepositories 上搜索 "Geaflow" 找到。

### <font style="background-color:#FBDE28;">构建 Geaflow 源代码并发布到 nexus</font>

#### 配置 Apache 账户密码

在将 Geaflow 发布到 Nexus 之前，您需要安全配置 Apache 账户凭据。此步骤至关重要，因为密码必须加密。

首先，打开您的 Maven 全局设置文件 `settings.xml`，通常位于 `~/.m2/settings.xml`。添加或修改
以下部分：

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

**重要说明：**

- 将 `your-apache-username` 替换为您的 Apache LDAP 用户名
- 密码必须使用 Maven 的密码加密工具加密
- 加密的密码应包含在花括号 `{}` 中

有关详细的加密说明，请参考官方文档：[发布 Maven 构件](https://infra.apache.org/publishing-maven-artifacts.html)

加密密码的步骤：

1. 生成主密码（如果尚未生成）：

```shell

mvn --encrypt-master-password your-master-password

```

将输出保存到 `~/.m2/settings-security.xml`：

```xml

<settingsSecurity>
    <master>{your-encrypted-master-password}</master>
</settingsSecurity>

```

2. 加密您的 Apache 账户密码：

```shell

mvn --encrypt-password your-apache-password

```

将加密的输出放入 `settings.xml` 中的 `password` 字段

#### 构建并发布 Java 模块

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

#### 构建并发布 Kotlin 模块

```shell

# Return to project root and navigate to Kotlin module
cd ../kotlin

# Execute the same Maven command as Java module
# Configuration parameters are identical to Java module
mvn -T10 clean deploy -Papache-release -DskipTests -Dgpg.skip=false

```

#### 构建并发布 Scala 模块

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

#### 在 Nexus 中锁定发布

完成所有模块的发布后，在 Nexus 中执行以下步骤：

1. 登录到 Apache Nexus 仓库管理界面
2. 导航到 "Snapshots" 或 "Releases" 仓库（取决于您的发布类型）
3. 找到最新的 Geaflow 项目版本
4. 执行 "Close" 操作以验证所有上传的构件
5. 验证成功后，执行 "Release" 操作以完成部署

这些步骤确保所有发布的构件都经过验证并正确部署到公共仓库。

### 构建预发布版本

您需要在投票前构建预发布版本，例如：
[https://github.com/apache/Geaflow/releases/tag/v0.12.0-rc1](https://github.com/apache/fory/releases/tag/v0.12.0-rc1)

### Geaflow 社区投票（可选）

您需要向 Geaflow 社区发送电子邮件：dev@Geaflow.apache.org：

标题：

```plain
[VOTE] Release Apache Geaflow v${release_version}-${rc_version}
```

内容：

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

在至少获得 3 个 +1 绑定投票（来自 Geaflow Podling PMC 成员和提交者）且无反对票后，
首先，回复上述投票线程通知投票已结束。

```plain
Hi all,

The vote for Release Apache Geaflow v${release_version}-${rc_version} is closed now.

Thanks to everyone for helping checking and voting for the release.

I will close the vote later in another thread.

Best,
${name}
```

随后，立即启动一个新的投票线程来宣布投票结果。

标题：

```plain
[RESULT][VOTE] Release Apache Geaflow v${release_version}-${rc_version}
```

内容：

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

### 如果投票失败怎么办

如果投票失败，请点击 "Drop" 放弃暂存的 Maven 构件。

解决提出的问题，然后升级 `rc_version` 并再次发起新的投票。

## <font style="background-color:#FBDE28;">正式发布</font>

### 将构件发布到 SVN 发布目录

- release_version: Geaflow 的发布版本，如 0.5.0
- release_candidate_version: 投票的版本，如 0.5.0-rc1

```bash
svn mv https://dist.apache.org/repos/dist/dev/Geaflow/${release_version}-${rc_version} https://dist.apache.org/repos/dist/release/Geaflow/${release_version} -m "Release Geaflow ${release_version}"
```

在仓库 [https://dist.apache.org/repos/dist/dev/Geaflow/](https://dist.apache.org/repos/dist/dev/fory/) 中，如果在发布 release_version 时留下了任何过时的 release_candidate_version，
请清理它们以保持 dev 仓库整洁。

当 `https://archive.apache.org/dist/Geaflow/0.12.0/${release_version}` 可访问时（确认 release_version 已成功发布并归档），我们可以清理发布仓库中的以前版本，
只留下当前版本。

### 更新 Geaflow 和 Geaflow-Site 内容

提交 PR 到 [https://github.com/apache/Geaflow-site](https://github.com/apache/fory-site) 更新 Geaflow-site。
参考实现：[#283](https://github.com/apache/fory-site/pull/283)
和 [#285](https://github.com/apache/fory-site/pull/285)。

#### 更新 Geaflow-Site

一般来说，需要修改以下两个关键区域：

1. 撰写新的公告，例如：
   在 blog 文件夹下添加新的 markdown 文件：

```plain
The Apache Geaflow team is pleased to announce the [?] release. This is a major release that includes [? PR](https://github.com/apache/Geaflow/compare/v[?]...v[?]) from ? distinct contributors. See the [Install](https://Geaflow.apache.org/docs/docs/start/install) Page to learn how to get the libraries for your platform.
```

2. 通过将旧版本升级到新版本来替换版本。
   例如，在 [install](https://fory.apache.org/docs/docs/start/install/#java) 部分，需要同时更新开发分支和最新发布分支的文档：

```plain
<dependency>
 <groupId>org.apache.Geaflow</groupId>
 <artifactId>Geaflow-core</artifactId>
 <version>0.11.2</version>
</dependency>

```

#### 更新 Geaflow

提交 PR 到 [https://github.com/apache/fury](https://github.com/apache/fury) 更新 [README](https://github.com/apache/fury/blob/main/README.md)，
如 [#2207](https://github.com/apache/fury/pull/2207)。

### Github 正式发布

您需要在 Geaflow 项目中正式发布此版本
参考实现：[https://github.com/apache/Geaflow/releases/tag/v0.12.0](https://github.com/apache/fory/releases/tag/v0.12.0)

### 发布 Maven 构件

- maven_artifact_number: Maven 暂存构件的编号，如 1001。
- 打开 [https://repository.apache.org/#stagingRepositories](https://repository.apache.org/#stagingRepositories)。
- 找到构件 `orgapacheGeaflow-${maven_artifact_number}`，点击 "Release"。

### 发送公告

将发布公告发送到 dev@Geaflow.apache.org 并抄送 announce@apache.org。

标题：

```plain
[ANNOUNCE] Apache Geaflow ${release_version} released
```

内容：

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

请记住使用纯文本而不是富文本格式，否则在抄送 announce@apache.org 时可能会被拒绝。

<font style="color:rgb(0, 0, 0);">完成这些步骤后，Geaflow 发布流程即完成。</font>
