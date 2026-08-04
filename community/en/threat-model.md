---
title: Threat Model
---

# Apache GeaFlow (Incubating) Threat Model

## §1 Header

| | |
| --- | --- |
| **Project** | Apache GeaFlow (Incubating) |
| **Modelled against** | `apache/geaflow` commit `958b8039` |
| **Date** | 2026-08-04 |
| **Status** | **DRAFT. Not reviewed or ratified by the PPMC.** Produced from public artifacts only; no maintainer has confirmed any statement below. |

**Version binding.** This model is versioned alongside the project. A report filed
against GeaFlow version *N* is triaged against the model as it stood at *N*, not
against HEAD.

**Reporting cross-reference.** Findings that violate a property claimed in §8 should
be reported privately per the project's
[`SECURITY.md`](https://github.com/apache/geaflow/blob/master/SECURITY.md). Findings
that fall under §3 (out of scope) or §9 (properties not provided) will be closed
citing this document.

**Provenance legend.** Every non-trivial claim carries one tag:

- *(documented)*: stated in the project's own documentation, or declared in code as
  a shipped default or a user-visible description string. Source cited.
- *(maintainer)*: stated by a GeaFlow maintainer in response to this process.
- *(inferred)*: reasoned from code structure or the absence of a feature. Not yet
  confirmed, and carries a matching question in §14.

**Draft confidence: 20 documented / 0 maintainer / 30 inferred.** Slightly under half
of this document is confirmed fact; the rest is hypothesis awaiting a PPMC answer.
That ratio is the point of publishing a draft, but it means no section here should
yet be cited as settled policy.

**What GeaFlow is.** GeaFlow is a distributed streaming graph computing engine. Users
define graphs and write queries in a SQL-like graph query language (GQL); the engine
compiles them into a dataflow plan and executes it across a cluster of JVM processes
that exchange data over a Netty shuffle channel and control messages over RPC. A
separate web application, GeaFlow Console, provides accounts, tenants, metadata and
job submission on top of the engine.

## §2 Scope and intended use

**Primary intended use** *(documented,* `docs/docs-en/source/7.deploy/1.install_guide.md`*)*:
a multi-node graph analytics cluster, deployed on Kubernetes, fed by a graph modelled
and submitted through GeaFlow Console. Two smaller shapes are documented as quick
starts *(documented,* `docs/docs-en/source/3.quick_start/`*)*: a single-JVM local job,
and an all-in-one Docker image bundling the console with MySQL, Redis and InfluxDB.

**Caller roles.** GeaFlow is a cluster service, not an in-process library, so there is
no single "caller". Three roles are modelled separately and appear separately in §6
and §7:

- **Client**: submits GQL and reads results, via the console or an analytics endpoint.
- **Operator / deployer**: chooses the deployment topology, network exposure and
  configuration. Owns everything in §10.
- **Peer**: another GeaFlow process in the same job (master, driver, container,
  supervisor), reached over RPC and the shuffle channel.

**Component families.**

| Family | Representative entry point | Touches outside the process | In model? |
| --- | --- | --- | --- |
| DSL / query pipeline | `GeaFlowDSLParser`, `QueryClient` | via connectors only | **Yes** |
| Analytics service | `POST /rest/analytics/query/execute`; gRPC `AnalyticsService.executeQuery` | network listener | **Yes** |
| Cluster control plane | brpc master / driver / container / supervisor endpoints | network listener | **Yes** |
| Shuffle data plane | Netty, `MessageIterator` | network listener | **Yes** |
| State and checkpoint stores | `DefaultKVSerializer` over RocksDB, Paimon, Redis, JDBC | filesystem, network, DFS | **Yes** |
| Connectors | `ConnectorFactory`, ~16 modules | network, filesystem, object stores | **Yes** |
| Agent / observability | `AgentWebServer`, master dashboard on `geaflow.master.http.port` | network listener, spawns processes | **Yes** |
| GeaFlow Console | Spring Boot app, `/api/**` | network, database, spawns JVMs, k8s API | **Yes** |
| Kubernetes operator | `GeaflowJob` CRD | k8s API | No, see §3 |
| MCP server (`geaflow-mcp`) | MCP tool interface | filesystem | No, see §3 |
| AI plugin (`geaflow-ai`) | Python plugin | LLM endpoints | No, see §3 |

## §3 Out of scope (explicit non-goals)

**Code that ships but is not covered by this model.** State the policy explicitly so
integrators do not extend the core's guarantees to it by association:

- `geaflow/geaflow-examples/`, `bin/`, `data/`: sample jobs, launcher scripts and
  sample payloads. Illustrative, not supported. *(inferred, §14 Q7)*
- `geaflow-kubernetes-operator/`: a separately deployed controller with its own
  cluster-scoped RBAC posture. It deserves its own model rather than inheriting the
  engine's. *(inferred, §14 Q7)*
- `geaflow-mcp/`, `geaflow-ai/`: newer, separately authored surfaces. *(inferred,
  §14 Q7)*
- The all-in-one demo Docker images (`geaflow-console/Dockerfile-*`): these bundle a
  database, a cache and a metrics store into one image for evaluation. They are a
  demonstration artifact, not a deployment target, and their configuration is not part
  of the model. *(inferred, §14 Q7)*

**Threats not defended against at this layer.** Each is stated with its reason, and
each is a disposition in §13:

- An adversary who already controls a GeaFlow JVM, its configuration file, or its
  host. Such an adversary has already won; nothing below that line is a boundary.
- An adversary with the operator role. Configuration is trusted input by construction.
- Correctness or availability of the external systems a connector reaches (Kafka,
  JDBC, HDFS, object stores). GeaFlow is a client to them.
- Side-channel adversaries (timing, cache, power). No constant-time or
  side-channel-resistant behaviour is attempted anywhere. *(inferred, §14 Q9)*

## §4 Trust boundaries and data flow

The load-bearing claim of this document, and the one most in need of PPMC
ratification:

> **The console API is the authenticated trust boundary. Inside a GeaFlow cluster,
> there is no boundary: RPC, shuffle and state channels treat whatever arrives as
> already authenticated, and a submitted query is trusted to the same degree as
> engine code.** *(inferred, §14 Q1 and Q2)*

Data crosses trust levels at three points:

1. **Client to console.** The console authenticates the request and resolves it to a
   user, tenant and role *(documented,* `docs/docs-en/source/4.concepts/5.console_principle.md`*)*.
   This is the only place in the system where an identity is established.
2. **Console to engine.** The console launches a job (as a local JVM, or as
   Kubernetes pods) carrying the job configuration and a task token. From here on the
   query is engine-privileged. *(inferred, §14 Q2)*
3. **Peer to peer.** Shuffle frames and RPC payloads are deserialized directly into
   objects. There is no authentication of the sending peer and no restriction on the
   types the stream may name. *(documented:* `KryoSerializer` sets
   `setRegistrationRequired(false)`*; the consequence is (inferred), §14 Q3)*

**Reachability preconditions.** The test a triager applies to a tool or AI finding
before anything else:

| Family | A finding matters only if reachable from |
| --- | --- |
| DSL / query pipeline | GQL text a client is entitled to submit |
| Analytics service | a request to the analytics port |
| Cluster control plane, shuffle | a message from a network position inside the cluster |
| State stores | bytes previously written by this job, or by whoever can write the store |
| Connectors | data returned by the external system, or properties set in the query |
| Agent / observability | a request to the agent or dashboard port |
| Console | an HTTP request, authenticated or not, to the console port |

## §5 Assumptions about the environment

- A JVM (Java 8+) on Linux, with the project's declared dependency set. *(documented,*
  `pom.xml`*)*
- The cluster network is reachable between all job processes, and is not shared with
  untrusted parties. *(inferred, §14 Q1)*
- A writable work directory and log directory (`geaflow.work.path` default `/tmp`,
  `geaflow.log.dir`). *(documented,* `ExecutionConfigKeys.java`*)*
- Where configured, an external MySQL, Redis, InfluxDB and DFS are reachable and are
  themselves access-controlled by the operator. *(inferred, §14 Q10)*

**What GeaFlow does to its host.** These are negative claims of the sort that are
almost never written down, so this inventory is the highest-priority confirmation
target in the document. It is stated as what GeaFlow *does*, because the list is not
empty:

- **Spawns processes.** The console forks job JVMs in container runtime mode; the
  agent runs an external profiler and `jstack`; `geaflow-infer` starts a Python
  interpreter and creates a virtualenv. *(documented, by the existence of
  `ContainerRuntime`, `ShellUtil`, `geaflow-infer`)*
- **Opens listening sockets** on multiple ports, most binding all interfaces. See §5a.
  *(inferred, §14 Q4)*
- **Reads and writes the filesystem** under the work, log and connector paths.
- It does **not** install signal handlers, mutate global locale or FPU state, or read
  the environment beyond documented deployment variables. *(inferred, §14 Q4)*

## §5a Build-time and configuration variants

GeaFlow is not one binary but a family of deployment shapes. The knobs below change
which security properties hold. Defaults are as declared in code.

| Key | Default | Effect | Maintainer stance |
| --- | --- | --- | --- |
| `geaflow.http.rest.service.enable` | `true` *(documented,* `ExecutionConfigKeys.java:323`*)* | When true, starts the master dashboard on `geaflow.master.http.port` (default `8090`) and the metric RPC server. Setting it false is the single largest reduction in listening surface. | **Unresolved, §14 Q4** |
| `geaflow.agent.http.port` | `0`, meaning a port chosen in 50000-60000 *(documented,* `ExecutionConfigKeys.java:72`*)* | The agent web server is started unconditionally; there is no enable flag. It serves log retrieval, thread dumps and profiler runs. | **Unresolved, §14 Q4** |
| `geaflow.supervisor.enable` | `false` *(documented,* `ExecutionConfigKeys.java:357`*)* | When true, adds a control endpoint able to stop and restart the worker process. | Off by default. |
| `kubernetes.service.exposed.type` | `NODE_PORT` *(documented,* `KubernetesConfigKeys.java:73`*)* | Publishes job endpoints on every node's address. `CLUSTER_IP` keeps them inside the cluster. | **Unresolved, §14 Q5** |
| `geaflow.analytics.service.server.type` | `analytics_rpc` *(documented,* `AnalyticsServiceConfigKeys`*)* | Selects the gRPC or HTTP query endpoint. Either way the endpoint accepts arbitrary GQL. | **Unresolved, §14 Q2** |
| `geaflow.deploy.mode` (console) | `local` *(documented,* `DeployConfig.java`*)* | `local` starts embedded datastores with bundled credentials; `cluster` uses external ones supplied by the operator. | `local` is for evaluation. *(inferred, §14 Q7)* |

**The insecure-default case.** Two of the rows above are defaults that, on a network
the operator has not isolated, void properties an integrator would reasonably expect:
`geaflow.http.rest.service.enable=true` and `kubernetes.service.exposed.type=NODE_PORT`.
The model is ambiguous until the PPMC rules whether each default is (a) the supported
production posture, making a report against it `VALID`, or (b) a convenience that
operators are documented as required to change, making it
`OUT-OF-MODEL: non-default-build`. This draft does not guess. See §14 Q4 and Q5.

## §6 Assumptions about inputs

Rows are keyed by endpoint or protocol message rather than by function, since this is
a service rather than a library.

### Engine

| Entry point | Input | Attacker-controllable? | Caller / operator must enforce |
| --- | --- | --- | --- |
| `POST /rest/analytics/query/execute` | `query` (GQL text) | **yes**, if the port is reachable | who can reach the port |
| gRPC `AnalyticsService.executeQuery` | `QueryRequest.query` | **yes**, if the port is reachable | who can reach the port |
| Any GQL statement | `WITH (...)` table properties | **yes**, from the submitter | see note below |
| Any GQL statement | `CREATE FUNCTION ... AS '<class>'` | **yes**, from the submitter | what is on the classpath |
| brpc control endpoints | kryo-encoded payload | **yes**, from a network position | network isolation |
| Netty shuffle | kryo-encoded record frames | **yes**, from a network position | network isolation |
| State / checkpoint stores | serialized state bytes | **yes**, for whoever can write the store | store access control |
| Connector reads | records from Kafka, JDBC, files, HDFS, ... | **yes** | validity of upstream data |
| Agent endpoints | `path`, `pid`, `duration` parameters | **yes**, if the port is reachable | network isolation |
| Job configuration | every `geaflow.*` key | **no**, trusted operator input | integrity of the config source |

**Note on `WITH` properties.** `GeaFlowTable.getConfigWithGlobal` merges query-supplied
table properties *on top of* the global server configuration
(`conf.putAll(globalConf); conf.putAll(this.config);`, `GeaFlowTable.java:147-151`)
*(documented)*. A query therefore selects the connector and supplies its endpoint,
path and credentials, overriding server-side values. Anyone able to submit a query can
direct a connector at a destination of their choosing. *(inferred, §14 Q2)*

### Console

| Entry point | Input | Attacker-controllable? | Operator must enforce |
| --- | --- | --- | --- |
| `POST /auth/register` | new account | **yes**, unauthenticated by design | who can reach the console |
| `POST /auth/login` | credentials | **yes** | password policy, externally |
| `/api/**` | `geaflow-token` via query string, header or cookie | **yes** | transport confidentiality |
| `POST /instances/{instance}/functions` | UDF JAR, multipart, up to 500 MB | **yes**, from an authenticated user | who is granted upload rights |
| Task callbacks | `TASK-`-prefixed token | **yes**, if the token leaks | protection of job configuration |

**Note on first-user bootstrap.** There is no seeded administrator account and no
default password. The first account to register on a fresh instance is granted
`SYSTEM_ADMIN` (`UserService.java:96-99`) *(documented; the behaviour is also stated in
the installation guide)*. A console reachable before an administrator has registered
grants that role to whoever registers first.

**Rate and size assumptions.** No documented rate limit exists on any endpoint. The
console caps uploads at 500 MB. No limit is documented on query complexity, result
size, or graph traversal depth. *(inferred, §14 Q6)*

## §7 Adversary model

| Adversary | Capabilities assumed | In model? |
| --- | --- | --- |
| Unauthenticated network client reaching the console port | HTTP requests, register and login attempts | **Yes** |
| Authenticated console user, non-admin | full use of their tenant's API, UDF upload, query submission | **Yes** |
| Co-tenant console user | as above, in a different tenant, attempting to reach another's data | **Yes**, see §8 |
| Client reaching an engine port directly | arbitrary GQL, arbitrary RPC and shuffle frames | **Unresolved, §14 Q1** |
| Malicious upstream data source | crafted records returned to a connector | **Yes** |
| Byzantine peer | a process inside the job behaving arbitrarily | **No**, see below |
| Operator / deployer | full configuration control | **No**, trusted |
| Adversary on the GeaFlow host | process and filesystem access | **No**, already won |

**On Byzantine peers.** GeaFlow's distributed execution is a job-scoped dataflow, not
a consensus protocol among mutually distrusting parties; all processes in a job are
launched by the same operator from the same image. A peer that misbehaves is treated
as a fault, not an adversary, and no honest-fraction threshold is claimed. *(inferred,
§14 Q3)*

## §8 Security properties the project provides

Each property states the conditions under which it holds, the symptom of a violation,
and whether a violation is security-critical or correctness-only.

**P1. Console API authentication.** Requests to `/api/**` require a session token that
is present, known and not older than 24 hours; requests without one are rejected.
*(documented,* `docs/docs-en/source/4.concepts/5.console_principle.md`*: "standardized
RESTful APIs and authentication mechanisms")*
*Violation symptom:* an unauthenticated request reaching a tenant resource.
*Severity:* **security-critical.**

**P2. Tenant isolation of console metadata.** Metadata reads and writes performed in a
tenant session are constrained to that tenant. *(documented, ibid.: "multi-tenant
isolation")*
*Violation symptom:* one tenant reading or modifying another tenant's instances,
graphs, tables, functions or jobs.
*Severity:* **security-critical.**
*Condition:* this property is scoped to console-managed metadata. It is not claimed for
engine state, job output, or anything below the console. *(inferred, §14 Q8)*

**P3. Role-gated system administration.** Operations reserved to `SYSTEM_ADMIN` or
`TENANT_ADMIN` are refused to users without the role. *(documented, ibid.:
"fine-grained user permission control")*
*Violation symptom:* a user without the role performing cluster, version, tenant or
system-configuration changes.
*Severity:* **security-critical.**

**P4. Query validation.** Malformed or ill-typed GQL is rejected with an error rather
than producing undefined behaviour. *(inferred, §14 Q6)*
*Violation symptom:* a parser or planner crash, hang, or silent wrong plan on
syntactically invalid input.
*Severity:* **correctness-only**, unless it is reachable from a client the deployment
does not trust, in which case it escalates via §14 Q1.

**No property is claimed for the engine's network surfaces.** Neither the analytics
endpoints, the cluster RPC, the shuffle channel nor the agent endpoints claim
authentication, authorization, integrity or confidentiality. This is stated as a fact
about the current contract, not as a recommendation. See §9 and §14 Q1.

## §9 Security properties the project does *not* provide

This section and §10 are deliberately more substantial than §8. That asymmetry is the
honest shape of the model as it stands.

- **No authentication or authorization on any engine-side network service.** The
  analytics HTTP and gRPC endpoints, the master dashboard, the agent web server, the
  metric service and the brpc control endpoints all serve any client that can reach
  them. *(inferred, §14 Q1)*
- **No transport security anywhere.** No TLS configuration surface exists in the
  project: no keystore or truststore settings, no `server.ssl.*` properties, and the
  analytics gRPC client connects in plaintext. Confidentiality and integrity in
  transit are entirely the operator's to provide. *(inferred, §14 Q11)*
- **No safe handling of untrusted serialized data.** Kryo runs with registration not
  required (`KryoSerializer.java:74`) *(documented)*, so a stream may name any class on
  the classpath. Anything that can write to a shuffle channel, an RPC endpoint or a
  state store is trusted accordingly. *(inferred, §14 Q3)*
- **No sandboxing of user-defined functions.** A UDF runs in the engine JVM with the
  engine's privileges. There is no restriction on what it may do. *(inferred, §14 Q2)*
- **No isolation between a query and the engine's environment.** Because query
  properties override server configuration (§6), the query author selects connector
  endpoints and credentials. *(inferred, §14 Q2)*
- **No stated resource bound on query execution.** No threshold is documented for
  memory, CPU, result size or traversal depth, so "this query exhausts the cluster"
  cannot currently be triaged either way. *(inferred, §14 Q6)*
- **No confidentiality for credentials at rest.** Connector, datastore and object-store
  credentials are carried as ordinary configuration values. *(inferred, §14 Q13)*
- **No engine-level tenancy.** Tenancy is a console database concept; it does not
  follow the job into the engine. *(inferred, §14 Q8)*
- **No constant-time or side-channel-resistant operations.** *(inferred, §14 Q9)*

### False friends

Features that look like a security property and are not one. These are the highest
value statements here for an integrator, because each corrects an assumption a reader
is likely to arrive with:

- **`geaflow.analytics.client.access.token`** is described as an "analytics client
  access token for auth" *(documented,* `AnalyticsClientConfigKeys.java:68-71`*)*, but
  it is referenced only by client-side configuration. No server-side verification of it
  exists. It is a client credential with nothing to present it to. *(inferred, §14 Q12)*
- **`@GeaflowConfigValue(masked = true)`** is a display hint that tells the console UI
  to obscure a field. It is applied to four fields and does not encrypt, redact or
  otherwise protect the stored value. *(inferred, §14 Q13)*
- **A GQL query is not a sandboxed expression.** It is closer to a job submission than
  to a database query: it can name a class to load and can direct a connector at an
  arbitrary endpoint. *(inferred, §14 Q2)*

### Well-known attack classes left to the caller

Named to put integrators on notice, not to catalogue:

- **Query-as-code-execution**, the class shared by every engine that accepts
  user-supplied functions or plugins.
- **Deserialization gadget chains**, the class that follows from any unrestricted
  object stream.
- **Server-side request forgery**, since a query names the endpoint a connector dials.
- **Resource-exhaustion via graph traversal blowup**, the graph-engine analogue of a
  decompression bomb: a small query can describe a very large intermediate result.
- **Credential harvesting from job configuration**, since configuration travels with
  the job.

## §10 Downstream responsibilities

What an operator must do for the assumptions in §5 to §7 to hold. This is a contract,
not a how-to:

1. **Treat the right to submit a query as equivalent to the right to run code** in the
   engine's security context. Grant it accordingly.
2. **Do not place engine ports on an untrusted network.** That includes the analytics
   endpoint, the master dashboard (`geaflow.master.http.port`, default `8090`), the
   agent port, the driver RPC port (default `6123`) and the shuffle channel.
3. **Provide transport security externally.** If GQL, results or job configuration
   traverse a network you do not control, tunnel or terminate TLS in front of GeaFlow.
4. **Register the first console account immediately after installation**, before the
   console is reachable by anyone else, since that account becomes `SYSTEM_ADMIN` (§6).
5. **Control who can reach `POST /auth/register`.** It is unauthenticated by design.
6. **Set `kubernetes.service.exposed.type=CLUSTER_IP`** unless you specifically intend
   job endpoints to be published on every node.
7. **Set `geaflow.http.rest.service.enable=false`** in deployments that do not need the
   dashboard.
8. **Scope the Kubernetes service account** to what the job needs, rather than adopting
   a broad role from a quick-start snippet.
9. **Do not run the all-in-one demo image in production**, and do not publish its
   bundled database, cache or metrics ports.
10. **Own the access control of every external system** a connector reaches, and of
    every state and checkpoint store, since GeaFlow trusts what it reads back.

## §11 Known misuse patterns

Captured as an inventory in this draft; each should be expanded before publication.

- Exposing the console, or an analytics endpoint, directly to the public internet.
- Treating `geaflow.analytics.client.access.token` as an enforced authentication
  control (see §9).
- Running the evaluation Docker image as a production deployment.
- Granting query submission to a population broader than the one you would grant shell
  access on the engine hosts.
- Assuming console tenant isolation extends to engine state, job output or checkpoints.
- Passing credentials through query text, where they enter job configuration and
  metadata.

## §11a Known non-findings (recurring false positives)

**This section is provisional.** Every entry depends on a §14 answer that has not been
given. It is written down so the PPMC can ratify or reject each entry, and must not be
used as a suppression list until they have.

| Report shape | Proposed disposition | Discharged by | Blocked on |
| --- | --- | --- | --- |
| Any finding in `geaflow-examples/`, `bin/`, `data/` | `OUT-OF-MODEL: unsupported-component` | §3 | §14 Q7 |
| Insecure defaults in the all-in-one demo image | `OUT-OF-MODEL: unsupported-component` | §3 | §14 Q7 |
| "Endpoint X requires no authentication", for an engine port | `OUT-OF-MODEL: adversary-not-in-scope` **only if** the PPMC confirms the trusted-network posture | §7 | §14 Q1 |
| "Unsafe deserialization reachable from the shuffle or RPC channel" | `OUT-OF-MODEL: adversary-not-in-scope`, same condition | §4, §7 | §14 Q1, Q3 |
| "Connector credentials appear in job configuration" | `BY-DESIGN: property-disclaimed` | §9 | none |
| "No TLS on inter-node traffic" | `BY-DESIGN: property-disclaimed` | §9 | §14 Q11 |

## §12 Conditions that would change this model

Revise when any of the following happens:

- A new network listener, or authentication added to an existing one.
- A change of default for any §5a knob.
- A new connector, or a change to how table properties merge with server configuration.
- A new deployment shape, or promotion of the operator, MCP or AI surfaces into the
  supported perimeter.
- Adoption of TLS or of a credential store.
- **A report that cannot be routed cleanly to one §13 disposition.** That means the
  model has a gap: the correct response is to revise this document, adding the property
  to §8 or §9, rather than to make an ad-hoc call on the report.

## §13 Triage dispositions

The closed set of outcomes for a report, tool finding or AI analysis judged against
this model. A finding that does not fit is not "other": it is `MODEL-GAP`, and the
model gets revised.

| Disposition | Meaning | Licensed by |
| --- | --- | --- |
| `VALID` | Violates a property claimed in §8, via an in-scope adversary and input. | §8, §6, §7 |
| `VALID-HARDENING` | No §8 property is violated, but the interface makes a §11 misuse easy enough that the project elects to harden it. Reported privately, fixed at maintainer discretion, typically no CVE. | §11 |
| `OUT-OF-MODEL: trusted-input` | Requires control of an input the model marks trusted, such as job configuration. | §6 |
| `OUT-OF-MODEL: adversary-not-in-scope` | Requires a capability the model excludes, such as a network position inside the cluster. | §7 |
| `OUT-OF-MODEL: unsupported-component` | Lands in code placed out of scope. | §3 |
| `OUT-OF-MODEL: non-default-build` | Manifests only under a discouraged or non-default configuration. | §5a |
| `BY-DESIGN: property-disclaimed` | Concerns a property §9 explicitly does not provide. | §9 |
| `KNOWN-NON-FINDING` | Matches a ratified entry in §11a. | §11a |
| `MODEL-GAP` | Cannot be routed to any of the above. | triggers §12 |

## §14 Open questions for the maintainers

Each question states a proposed answer, so the PPMC can confirm, correct or strike it
rather than compose from scratch. Answering wave 1 resolves most of the document.

### Wave 1: scope and posture

**Q1. Is the cluster network a trust boundary?** *Proposed:* no. GeaFlow assumes all
engine ports (analytics, dashboard, agent, RPC, shuffle) sit on a network reachable
only by the operator and the cluster itself, in the same way Apache Spark and Apache
Flink assume it of theirs. A report of "endpoint X is unauthenticated" is then
`OUT-OF-MODEL: adversary-not-in-scope`, and the obligation moves to §10.
*Lands in:* §4, §7, §9, §11a. *Blocks:* almost everything.

**Q2. Is submitting a query equivalent to executing code?** *Proposed:* yes. Given
`CREATE FUNCTION` class loading and query-controlled connector properties, the right
to submit GQL should be treated as the right to run code with engine privileges, and
§10 should say so.
*Lands in:* §4, §6, §9.

**Q3. Are peers trusted?** *Proposed:* yes. All processes in a job come from one
operator and one image, so a misbehaving peer is a fault, not an adversary, and
unrestricted deserialization on inter-node channels is in-model.
*Lands in:* §4, §7, §9.

**Q4. What is the intended posture of the agent and dashboard endpoints?** *Proposed:*
diagnostic surfaces intended for an operator-controlled network. Note the agent server
has no enable flag, unlike `geaflow.http.rest.service.enable`. Is that intentional?
*Lands in:* §5, §5a, §10.

**Q5. Is `kubernetes.service.exposed.type=NODE_PORT` the supported production
default?** *Proposed:* it is a convenience for evaluation, and production deployments
are expected to set `CLUSTER_IP`. If so §10 keeps item 6 and a report against the
default is `OUT-OF-MODEL: non-default-build`; if not, it is `VALID`.
*Lands in:* §5a, §10, §13.

### Wave 2: properties and limits

**Q6. Where is the line on resource consumption?** *Proposed:* no resource guarantee is
made; a query that exhausts cluster memory or runs unboundedly is a performance issue,
not a vulnerability. A categorical answer ("super-linear in input size is a bug", "a
hang is a bug", or "no guarantee at all") is more useful than a number.
*Lands in:* §8 P4, §9.

**Q7. Is the out-of-scope list in §3 right?** *Proposed:* examples, scripts, sample
data, the operator, MCP, the AI plugin and the demo images are all outside this model,
the operator because it warrants its own.
*Lands in:* §3, §11a.

**Q8. Does tenant isolation extend below the console?** *Proposed:* no. Two tenants'
jobs may share engine state backends and are isolated only insofar as the operator
configures separate storage.
*Lands in:* §8 P2, §9.

**Q9. Are side channels out of scope?** *Proposed:* yes, entirely.
*Lands in:* §3.

### Wave 3: confirmations and meta

**Q10. What is assumed of the backing MySQL, Redis, InfluxDB and DFS?** *Proposed:*
that the operator access-controls them, and that GeaFlow trusts what it reads back.

**Q11. Is the absence of TLS deliberate or simply not yet built?** This changes whether
a TLS report is `BY-DESIGN: property-disclaimed` or a feature request.

**Q12. Should `geaflow.analytics.client.access.token` be removed, documented as
client-side only, or completed with server-side verification?** Its current name and
description imply an enforcement that does not exist.

**Q13. Is `masked = true` intended only as a UI hint?** *Proposed:* yes, and §9 should
say so plainly so nobody reads it as encryption at rest.

**Q14. Where should this document live, and who owns it?** *Proposed:* here, on the
project website, with `SECURITY.md` and `community/security.md` linking to it; revised
per §12; ratified by PPMC vote. Should a Chinese translation be maintained in
`community/zh/`?

## Appendix: `SECURITY.md` back-map

Coverage check against the project's existing security artifact, per the rubric's
requirement that this document be a strict superset of it. GeaFlow's `SECURITY.md` is
almost entirely disclosure process, which is out of scope for a threat model, so this
map is short by nature.

| `SECURITY.md` statement | Threat model section |
| --- | --- |
| Report vulnerabilities to `security@apache.org` | §1, reporting cross-reference |
| Report one finding per plaintext e-mail | not applicable, process |
| Acknowledgement within 3 business days, target 90 days to fix | not applicable, process |
| Do not disclose publicly before a fix | not applicable, process |
| Do not exploit beyond demonstrating | §7, adversary model |
| *(no statement of scope, trusted inputs, or non-vulnerabilities)* | this document adds §2, §3, §6, §7, §8, §9 |

Nothing asserted in `SECURITY.md` is dropped, weakened or contradicted here.
