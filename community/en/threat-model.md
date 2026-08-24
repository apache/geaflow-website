---
title: Threat Model
---

# Apache GeaFlow (Incubating) Threat Model

## §1 Header

| | |
| --- | --- |
| **Project** | Apache GeaFlow (Incubating) |
| **Modelled against** | `apache/geaflow` commit `3fafe740` |
| **Date** | 2026-08-21 |
| **Status** | **DRAFT. Not ratified by the PPMC.** Reviewed by the ASF Security Team; every code citation below has been checked against the tree named above. No PPMC vote has been taken, so nothing here is yet project policy. |

**Version binding.** This model is versioned alongside the project. A report filed
against GeaFlow version *N* is triaged against the model as it stood at *N*, not
against HEAD.

The first draft was modelled against `958b8039`. The binding has since moved to
`3fafe740`, which differs only in `SECURITY.md`: apache/geaflow#828 merged, routing
reports to the ASF Security Team. The appendix reflects the post-#828 text. No Java
line number cited here moved between the two commits.

**Reporting cross-reference.** Findings that violate a property claimed in §8 should
be reported privately per the project's
[`SECURITY.md`](https://github.com/apache/geaflow/blob/master/SECURITY.md). Findings
that fall under §3 (out of scope) or §9 (properties not provided) will be closed
citing this document.

**Provenance legend.** Every non-trivial claim carries one tag:

- *(documented)*: stated in the project's own documentation, or declared in code as
  a shipped default or a user-visible description string. Source cited.
- *(review)*: established during the ASF Security Team review of this draft. Sourced
  and code-verified, but a reviewer's reading rather than a project decision.
- *(maintainer)*: stated by a GeaFlow maintainer in response to this process.
- *(inferred)*: reasoned from code structure or the absence of a feature. Not yet
  confirmed, and carries a matching question in §14.

**Draft confidence.** See the count at the end of §14. The bulk of the document is now
either documented or review-established, but *(review)* is not ratification: the
posture questions in §14 were answered by a reviewer, and the PPMC has not voted on
them. Until it does, this document describes what the code does, not what the project
promises.

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

**Submitting a query is executing code.** This is the single most important sentence in
the document, and it is repeated in §9 and §10 because readers arrive expecting the
opposite. GQL is closer to a job submission than to a database query. Three independent
mechanisms make it so, any one of which would be sufficient *(review)*:

1. `CREATE FUNCTION name AS 'class'` loads the named class through the thread context
   class loader, with no allowlist, package restriction or type check before the load
   (`FunctionUtil.java:59`, `GeaFlowUserDefinedScalarFunction.java:58`). The optional
   `USING resource` clause means the class need not already be on the classpath
   *(documented,* `docs/docs-en/source/5.application-development/2.dsl/2.syntax/2.ddl.md:186`*)*.
2. Console UDF upload places a JAR of up to 500 MB on the engine classpath.
3. Query-supplied `WITH` properties are merged over the server's global configuration,
   so the query selects the connector, its endpoint and its credentials (§6).

**Caller roles.** GeaFlow is a cluster service, not an in-process library, so there is
no single "caller". Three roles are modelled separately and appear separately in §6
and §7:

- **Client**: submits GQL and reads results, via the console or an analytics endpoint.
  Holds, in effect, the right to run code in the engine's security context.
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
  sample payloads. Illustrative, not supported. *(review)*
- `tools/`: checkstyle configuration and an IDE formatter profile, wired into the build
  at `pom.xml:235` and excluded from the RAT license check at `pom.xml:328`. It ships in
  the source release but has no runtime surface. *(documented)*
- `geaflow-kubernetes-operator/`: a separately deployed controller whose default
  install is considerably more privileged than the engine it manages, and which
  therefore needs its own model rather than inheriting this one. Its Helm chart grants
  `verbs: ["*"]` across six API groups, including core `secrets`
  (`helm/geaflow-kubernetes-operator/templates/rbac.yaml:25-81`). The cluster-scoped
  binding is the default path, not an opt-in: it is selected when `.Values.watchNamespaces`
  is unset (`rbac.yaml:117`), and `values.yaml` never defines that key. A default
  `helm install` therefore yields cluster-wide wildcard access to Secrets.
  *(documented; the scoping conclusion is (review))*
- `geaflow-mcp/`, `geaflow-ai/`: newer, separately authored surfaces. **This exclusion
  expires.** It holds as of the commit this document is bound to and is to be revisited
  at each release rather than standing indefinitely; see the matching trigger in §12.
  *(review)*
- **Console deployments running `geaflow.deploy.mode=local`**: local mode starts
  embedded datastores with bundled credentials and is meant for evaluation. The
  carve-out attaches to the mode rather than to the all-in-one Docker images, because
  the mode is reachable outside those images and the images are not the thing that makes
  it unsafe. *(review)*

**Threats not defended against at this layer.** Each is stated with its reason, and
each is a disposition in §13:

- An adversary who already controls a GeaFlow JVM, its configuration file, or its
  host. Such an adversary has already won; nothing below that line is a boundary.
- An adversary with the operator role. Configuration is trusted input by construction.
- Correctness or availability of the external systems a connector reaches (Kafka,
  JDBC, HDFS, object stores). GeaFlow is a client to them.
- Side-channel adversaries (timing, cache, power). No constant-time or
  side-channel-resistant behaviour is attempted anywhere. GeaFlow implements no
  cryptography of its own. The corollary worth stating, so that reports of it are
  answered before they are filed: token and password comparison is ordinary equality,
  and is not intended to be otherwise. *(review)*

## §4 Trust boundaries and data flow

The load-bearing claim of this document:

> **The console API is the authenticated trust boundary. Inside a GeaFlow cluster,
> there is no boundary: RPC, shuffle and state channels treat whatever arrives as
> already authenticated, and a submitted query is trusted to the same degree as
> engine code.** *(review; §14 Q1 and Q2, answered but not PPMC-ratified)*

Data crosses trust levels at three points:

1. **Client to console.** The console authenticates the request and resolves it to a
   user, tenant and role *(documented,* `docs/docs-en/source/4.concepts/5.console_principle.md`*)*.
   This is the only place in the system where an identity is established. See P1 in §8
   for what that authentication does and does not cover.
2. **Console to engine.** The console launches a job (as a local JVM, or as
   Kubernetes pods) carrying the job configuration and a task token. From here on the
   query is engine-privileged. *(review)*
3. **Peer to peer, and job to store.** These are two different things and the model
   keeps them apart, because a single "we trust our peers" would quietly become "we
   trust anything ever written to a checkpoint path".
   - *Job-scoped channels.* Shuffle frames and RPC payloads are deserialized directly
     into objects, with no authentication of the sending peer and no restriction on the
     types the stream may name *(documented:* `KryoSerializer` sets
     `setRegistrationRequired(false)`*)*. Both endpoints exist only for the lifetime of
     one job, and both are launched by the same operator from the same image, so the
     set of possible writers is the set of peers. *(review, §14 Q3)*
   - *Durable stores.* A shared RocksDB, Paimon, Redis or DFS path outlives the job that
     wrote it and can be written by something that was never a peer. Bytes read back
     from a store are deserialized on the same unrestricted terms, but the "same
     operator, same image" argument does not reach them. Their integrity is an operator
     obligation (§10 item 10), not a property of the peer model. *(review, §14 Q3)*

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
  untrusted parties. *(review, §14 Q1)*
- A writable work directory and log directory (`geaflow.work.path` default `/tmp`,
  `geaflow.log.dir`). *(documented,* `ExecutionConfigKeys.java`*)*
- Where configured, an external MySQL, Redis, InfluxDB and DFS are reachable and are
  themselves access-controlled by the operator. *(review, §14 Q10)*

**What GeaFlow does to its host.** These are negative claims of the sort that are
almost never written down. It is stated as what GeaFlow *does*, because the list is not
empty:

- **Spawns processes.** The console forks job JVMs in container runtime mode; the
  agent runs an external profiler and `jstack`; `geaflow-infer` starts a Python
  interpreter and creates a virtualenv. *(documented, by the existence of
  `ContainerRuntime`, `ShellUtil`, `geaflow-infer`)*
- **Opens listening sockets** on multiple ports, most binding all interfaces. See §5a.
  *(review, §14 Q4)*
- **Reads and writes the filesystem** under the work, log and connector paths.
- It does **not** install signal handlers, mutate global locale or FPU state, or read
  the environment beyond documented deployment variables. *(inferred, §14 Q17)*

## §5a Build-time and configuration variants

GeaFlow is not one binary but a family of deployment shapes. The knobs below change
which security properties hold. Defaults are as declared in code; where the effective
default differs by deployment target, that is stated, because the ConfigKey default is
not always what runs.

| Key | Default | Effect | Stance |
| --- | --- | --- | --- |
| `geaflow.http.rest.service.enable` | `true` *(documented,* `ExecutionConfigKeys.java:323`*)* | Gates the master dashboard on `geaflow.master.http.port` (default `8090`) and the master's agent web server, both started at `AbstractMaster.java:99-104`. The container-side metric server is gated by the same key, checked inside its own constructor at `MetricServer.java:44` rather than at the call site (`AbstractContainer.java:58-59`). | Diagnostic surface, operator-controlled network. *(review, §14 Q4)* |
| `geaflow.agent.http.port` | `0`, meaning a port chosen in 50000-60000 *(documented,* `ExecutionConfigKeys.java:72`, `PortUtil.java:29-30,49-51`*)* | The agent serves log retrieval, thread dumps and profiler runs. On the **master** it is gated by the key above. On a **supervisor** it is not: `Supervisor.start()` calls `startAgent()` unconditionally and retries three times on failure (`Supervisor.java:79-83`, `:117-125`), and `HTTP_REST_SERVICE_ENABLE` is not referenced in that file. | Diagnostic surface, but the asymmetry is **unresolved, §14 Q4a.** |
| `geaflow.supervisor.enable` | ConfigKey default `false` *(documented,* `ExecutionConfigKeys.java:357`*)*, but **`true` on Kubernetes**: `KubernetesEnvironment.java:32` sets it in the environment constructor, and no shipped configuration file sets the key at all. `RayEnvironment.java:33` sets it false. A job can still override it, since `EnvironmentContext.withConfig` merges user config afterwards (`:37-41`). | Adds `SupervisorService`, two RPCs (`supervisor.proto:27-45`): `status()`, and `restart(pid)`, which calls `stopWorker(pid)` then `startWorker()` (`Supervisor.java:89-93`, `:111`). The PID is supplied by the caller. | Control plane, not diagnostics, and on by default on the primary deployment target. **Unresolved, §14 Q4b.** |
| `kubernetes.service.exposed.type` | `NODE_PORT` *(documented,* `KubernetesConfigKeys.java:73`*)* | Publishes job endpoints on every node's address. `CLUSTER_IP` keeps them inside the cluster. | Evaluation convenience, not the production posture. A report against the default is `OUT-OF-MODEL: non-default-build`; §10 item 6 is unconditional. *(review, §14 Q5)* |
| `geaflow.analytics.service.server.type` | `analytics_rpc` *(documented,* `AnalyticsServiceConfigKeys`*)* | Selects the gRPC or HTTP query endpoint. Either way the endpoint accepts arbitrary GQL, which per §2 is arbitrary code. | In model, unauthenticated by design. *(review, §14 Q1, Q2)* |
| `geaflow.deploy.mode` (console) | `local` *(documented,* `DeployConfig.java`*)* | `local` starts embedded datastores with bundled credentials; `cluster` uses external ones supplied by the operator. | `local` is out of model, see §3. *(review, §14 Q7)* |

**The insecure-default case.** The first draft flagged two defaults as ambiguous. One is
now settled: `kubernetes.service.exposed.type=NODE_PORT` is an evaluation convenience,
so a report against it closes `OUT-OF-MODEL: non-default-build`, and the standing
recommendation is that the shipped default move to `CLUSTER_IP`.

What remains open is narrower, and better posed as a question about consistency than
about exposure. The master honours an enable flag before starting its agent; the
supervisor does not, and the supervisor is on by default on Kubernetes. The same
deployment also carries a control-plane RPC that stops and restarts a caller-named
process. Neither is a vulnerability under the §14 Q1 posture, but both are surfaces the
project has not deliberately chosen. See §14 Q4a and Q4b.

## §6 Assumptions about inputs

Rows are keyed by endpoint or protocol message rather than by function, since this is
a service rather than a library.

### Engine

| Entry point | Input | Attacker-controllable? | Caller / operator must enforce |
| --- | --- | --- | --- |
| `POST /rest/analytics/query/execute` | `query` (GQL text) | **yes**, if the port is reachable | who can reach the port |
| gRPC `AnalyticsService.executeQuery` | `QueryRequest.query` | **yes**, if the port is reachable | who can reach the port |
| Any GQL statement | `WITH (...)` table properties | **yes**, from the submitter | see note below |
| Any GQL statement | `CREATE FUNCTION ... AS '<class>'` | **yes**, from the submitter | who may submit at all (§2) |
| brpc control endpoints | kryo-encoded payload | **yes**, from a network position | network isolation |
| Supervisor `restart(pid)` | caller-supplied PID | **yes**, from a network position | network isolation |
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
direct a connector at a destination of their choosing. *(review, §14 Q2)*

### Console

| Entry point | Input | Attacker-controllable? | Operator must enforce |
| --- | --- | --- | --- |
| `POST /auth/register` | new account | **yes**, unauthenticated by design | who can reach the console |
| `POST /auth/login` | credentials | **yes** | password policy, externally |
| `/api/**` | `geaflow-token`, resolved from query string, then header, then cookie | **yes** | transport confidentiality; see the CORS note in §8 P1 |
| `POST /instances/{instance}/functions` | UDF JAR, multipart, up to 500 MB | **yes**, from an authenticated user | who is granted upload rights |
| Task callbacks | `TASK-`-prefixed token | **yes**, if the token leaks | protection of job configuration |

**Note on token acceptance.** `GeaflowApiRequest.getSessionToken` tries the query string,
then the request header, then a cookie, in that order (`GeaflowApiRequest.java:55-66`),
and `GeaflowAuthInterceptor.java:67` is the sole consumer *(documented)*. Cookie
acceptance is what makes the CORS configuration in §8 P1 load-bearing rather than
cosmetic: a credential the browser attaches automatically is reachable cross-origin in a
way a header-only credential would not be.

**Note on first-user bootstrap.** There is no seeded administrator account and no
default password. The first account to register on a fresh instance is granted
`SYSTEM_ADMIN` (`UserService.java:96-99`) *(documented; the behaviour is also stated in
the installation guide)*. A console reachable before an administrator has registered
grants that role to whoever registers first.

**Rate and size assumptions.** No documented rate limit exists on any endpoint. The
console caps uploads at 500 MB. Two engine-side bounds do exist and are frequently
missed *(documented)*:

- `geaflow.dsl.max.traversal`, default `64` (`DSLConfigKeys.java:80-83`), enforced at
  `GeaFlowRuntimeGraph.java:160` for traversals and `:355` for algorithms. Read it
  precisely: it caps **iteration depth**, not work. It is raised internally for
  incremental traversal (`:189-193`, `maxTraversal * 2 - 1`) and `Integer.MAX_VALUE` is
  an accepted value.
- `geaflow.job.max.parallel`, default `1024` (`FrameworkConfigKeys.java:40-43`).

What is genuinely absent is a bound on **result size or memory**. The server
materializes an entire result set into one in-memory list
(`AbstractAnalyticsServiceServer.java:124-125`), and the JDBC client's limiting
controls are stubs: `setMaxRows` and `setFetchSize` have empty bodies and their getters
return `0` (`AnalyticsStatement.java:141`, `:146`, `:221`, `:226`). SQL `LIMIT` is
honoured but is supplied by the query author, not imposed by the server. See §9 for the
disposition. *(documented)*

## §7 Adversary model

| Adversary | Capabilities assumed | In model? |
| --- | --- | --- |
| Unauthenticated network client reaching the console port | HTTP requests, register and login attempts | **Yes** |
| Authenticated console user, non-admin | full use of their tenant's API, UDF upload, query submission | **Yes** |
| Co-tenant console user | as above, in a different tenant, attempting to reach another's data | **Yes**, see §8 |
| A web page the console user visits | cross-origin credentialed requests to `/api/**` | **Yes**, see §8 P1 and §14 Q15 |
| Client reaching an engine port directly | arbitrary GQL, arbitrary RPC and shuffle frames | **No**, see §14 Q1 |
| Whoever can write a state or checkpoint store | crafted serialized bytes read back by a later job | **Yes**, see §4 |
| Malicious upstream data source | crafted records returned to a connector | **Yes** |
| Byzantine peer | a process inside the job behaving arbitrarily | **No**, see below |
| Operator / deployer | full configuration control | **No**, trusted |
| Adversary on the GeaFlow host | process and filesystem access | **No**, already won |

**On Byzantine peers.** GeaFlow's distributed execution is a job-scoped dataflow, not
a consensus protocol among mutually distrusting parties; all processes in a job are
launched by the same operator from the same image, and there is no membership concept
on which to hang an adversary. A peer that misbehaves is treated as a fault, not an
adversary, and no honest-fraction threshold is claimed. This reasoning covers shuffle
and RPC only. It does not extend to durable stores, which is why they appear as a
separate row above. *(review, §14 Q3)*

## §8 Security properties the project provides

Each property states the conditions under which it holds, the symptom of a violation,
and whether a violation is security-critical or correctness-only.

**P1. Console API authentication.** Requests to `/api/**` require a session token that
is present, known and not older than 24 hours; requests without one are rejected.
*(documented,* `docs/docs-en/source/4.concepts/5.console_principle.md`*: "standardized
RESTful APIs and authentication mechanisms")*
*Violation symptom:* an unauthenticated request reaching a tenant resource.
*Severity:* **security-critical.**
*Condition, and it is a substantial one:* P1 says a request needs a token. It does not
say the request has to come from a page you trust. The console registers a permissive
CORS policy over every path, `addMapping("/**")` with `allowedOriginPatterns("*")`,
`allowedHeaders("*")`, `allowedMethods("*")` and `allowCredentials(true)`
(`GeaflowWebConfig.java:50-54`) *(documented)*. Combined with cookie-acceptable tokens
(§6), any origin can make credentialed requests to `/api/**` and read the responses.
Two smaller details point the same way: `GeaflowAuthInterceptor.java:61-63` returns
`true` for `OPTIONS` before any authentication, and `ErrorApiCorsConfigurer.java:38-41`
reflects the request `Origin` back with credentials allowed on error responses. **Do not
read P1 as protection against cross-origin requests from a browser.** This is the one
substantive gap the review surfaced and it has no agreed disposition yet; see §14 Q15.

**P2. Tenant isolation of console metadata.** Metadata reads and writes performed in a
tenant session are constrained to that tenant. **This isolation stops at the console.
Nothing in the engine carries a tenant identity**: it is console database rows plus the
token resolved at the auth interceptor, and job configuration reaches the engine as a
flat `geaflow.*` map with no tenant field. Two tenants' jobs may share engine state
backends, and are separated only insofar as the operator configures separate storage.
*(documented, ibid.: "multi-tenant isolation"; the scope limit is (review), §14 Q8)*
*Violation symptom:* one tenant reading or modifying another tenant's instances,
graphs, tables, functions or jobs **through the console API**.
*Severity:* **security-critical.**

**P3. Role-gated system administration.** Operations reserved to `SYSTEM_ADMIN` or
`TENANT_ADMIN` are refused to users without the role. *(documented, ibid.:
"fine-grained user permission control")*
*Violation symptom:* a user without the role performing cluster, version, tenant or
system-configuration changes.
*Severity:* **security-critical.**

**P4. Query validation.** Malformed or ill-typed GQL is rejected with an error rather
than being mis-planned. *(inferred, §14 Q17)*
*Violation symptom:* a parser or planner crash, or a silent wrong plan, on
syntactically invalid input.
*Severity:* **correctness-only.**
*Note:* this property is deliberately narrow. It says nothing about what a *valid*
query costs to run; resource consumption is disclaimed outright in §9, per §14 Q6.

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
  them. There is no auth code path on any engine listener, not even a disabled one.
  *(review, §14 Q1)*
- **No transport security on any GeaFlow-served endpoint.** No TLS configuration
  surface exists: no keystore or truststore settings, no `server.ssl.*` in the console's
  only Spring configuration file, and no SSL `ConfigKey` anywhere. The analytics gRPC
  client hardcodes `usePlaintext()` (`RpcQueryRunner.java:139`), and the console's
  default JDBC URL hardcodes `&useSSL=false` (`JdbcPluginConfigClass.java:47`).
  Confidentiality and integrity in transit are entirely the operator's to provide.
  Two things that exist and are *not* counterexamples: `kubernetes.cert.*`
  (`KubernetesConfigKeys.java:35,39,43,229`) are credentials for GeaFlow acting as a
  client of the Kubernetes API, and the operator Helm chart's ingress `tls` list is
  empty by default and terminates outside the application. *(documented; disposition is
  (review), §14 Q11)*
- **No safe handling of untrusted serialized data.** Kryo runs with registration not
  required (`KryoSerializer.java:74`) *(documented)*, so a stream may name any class on
  the classpath. For shuffle and RPC this is in-model, because the set of writers is the
  set of job peers (§4, §7). For **durable state and checkpoint stores it is not the
  same claim**: those outlive the job and their writer set is whatever the operator
  permits. Bytes read back from a store are trusted exactly as far as the store's own
  access control goes. *(review, §14 Q3)*
- **No sandboxing of user-defined functions.** A UDF runs in the engine JVM with the
  engine's privileges. There is no restriction on what it may do. *(review, §14 Q2)*
- **No isolation between a query and the engine's environment.** Because query
  properties override server configuration (§6), the query author selects connector
  endpoints and credentials. *(review, §14 Q2)*
- **No resource bound on result size or memory, and none is intended.** Iteration depth
  and job parallelism are bounded (§6); the size of what a query materializes is not.
  A query that exhausts cluster memory is a performance issue, not a vulnerability: the
  submitter is already entitled to run arbitrary code (§2) and could call
  `System.exit(0)` in a UDF to the same effect. Reports of this shape close
  `BY-DESIGN: property-disclaimed`. *(review, §14 Q6)*
- **No cross-origin request protection on the console.** Wildcard origins with
  credentials on every path, plus cookie-acceptable tokens, mean P1's authentication
  check does not imply the request came from a page the user trusts. See §8 P1.
  *(documented; disposition open, §14 Q15)*
- **No confidentiality for credentials at rest.** Connector, datastore and object-store
  credentials are carried as ordinary configuration values. *(documented, see below)*
- **No engine-level tenancy.** Tenancy is a console database concept; it does not
  follow the job into the engine. *(review, §14 Q8)*
- **No constant-time or side-channel-resistant operations**, and no cryptography of the
  project's own. *(review, §14 Q9)*

### False friends

Features that look like a security property and are not one. These are the highest
value statements here for an integrator, because each corrects an assumption a reader
is likely to arrive with:

- **`geaflow.analytics.client.access.token` is declared and never read.** It is
  described as an "analytics client access token for auth"
  (`AnalyticsClientConfigKeys.java:68-71`), and a search of the entire repository for
  both the constant and the literal key string returns three hits, all three inside that
  one declaration: no reads, no tests, no documentation. There is nothing to disable and
  nothing to verify; the key is dead. The obvious neighbour is dead too: the JDBC
  connect property `accesstoken` (`ConnectProperties.java:40`, `:135-140`) is parsed and
  validated from the URL and then dropped, since `AnalyticsDriverURI.java:25-26` consumes
  only `CUSTOM_HEADERS` and `SESSION_PROPERTIES`. **Neither token is consumed for
  authentication anywhere.** *(documented)*
- **`@GeaflowConfigValue(masked = true)`** is a display hint. `ConfigDescItem.java:80`
  copies it into a descriptor that `ConfigController` serves from `GET /config/*`, and
  the frontend uses it to decide whether to render dots (`configPanel.tsx:393` and four
  sibling components). It is applied to four production fields, the InfluxDB token, the
  JDBC password, the OSS secret key and the task token. There is no server-side
  redaction: the value is **stored and transmitted in the clear**, and the browser is
  the only thing that hides it. *(documented)*
- **A GQL query is not a sandboxed expression.** See §2. It can name a class to load,
  bring that class with it, and direct a connector at an arbitrary endpoint. *(review,
  §14 Q2)*

### Well-known attack classes left to the caller

Named to put integrators on notice, not to catalogue:

- **Query-as-code-execution**, the class shared by every engine that accepts
  user-supplied functions or plugins.
- **Deserialization gadget chains**, the class that follows from any unrestricted
  object stream, and which for durable stores is bounded by the store's access control
  rather than by job lifetime.
- **Server-side request forgery**, since a query names the endpoint a connector dials.
- **Unbounded result materialization**, the graph-engine analogue of a decompression
  bomb: iteration depth is capped but the size of the intermediate and final result is
  not, and the server holds the whole result set in memory.
- **Cross-site request forgery against the console**, given wildcard CORS with
  credentials and cookie-acceptable tokens.
- **Credential harvesting from job configuration**, since configuration travels with
  the job.

## §10 Downstream responsibilities

What an operator must do for the assumptions in §5 to §7 to hold. This is a contract,
not a how-to.

Two of the ten dominate the rest, and an operator who does only these two is in far
better shape than one who does the other eight. **Item 1 is the correct mental model for
the product**: a query is code. **Item 2 is what the model's central posture assumes you
have already done**: the engine defends no port itself, so the network has to.

1. **Treat the right to submit a query as equivalent to the right to run code** in the
   engine's security context. Grant it accordingly. This is not an analogy; see §2.
2. **Do not place engine ports on an untrusted network.** That includes the analytics
   endpoint, the master dashboard (`geaflow.master.http.port`, default `8090`), the
   agent port, the supervisor RPC port, the driver RPC port (default `6123`) and the
   shuffle channel. The model treats an unauthenticated engine port as expected
   behaviour, which is only tenable if this holds.
3. **Provide transport security externally.** If GQL, results or job configuration
   traverse a network you do not control, tunnel or terminate TLS in front of GeaFlow.
   Nothing in GeaFlow will do it for you.
4. **Register the first console account immediately after installation**, before the
   console is reachable by anyone else, since that account becomes `SYSTEM_ADMIN` (§6).
5. **Control who can reach `POST /auth/register`.** It is unauthenticated by design.
6. **Set `kubernetes.service.exposed.type=CLUSTER_IP`.** The shipped default publishes
   job endpoints, which under item 1 means unauthenticated code execution, on every
   node address.
7. **Set `geaflow.http.rest.service.enable=false`** in deployments that do not need the
   dashboard. Note this does not reach a supervisor's agent, which starts regardless
   (§5a).
8. **Scope the Kubernetes service account** to what the job needs, rather than adopting
   a broad role from a quick-start snippet. If you also run the operator, read its
   chart's RBAC before installing it (§3).
9. **Do not run the console in `geaflow.deploy.mode=local` in production**, and do not
   publish the bundled database, cache or metrics ports of the all-in-one image.
10. **Own the access control of every external system** a connector reaches, and of
    every state and checkpoint store, **and provide their transport security**, since
    GeaFlow trusts what it reads back and will not encrypt the connection itself. The
    console's own default JDBC URL disables TLS explicitly (§9).

## §11 Known misuse patterns

- Exposing the console, or an analytics endpoint, directly to the public internet.
- Relying on P1 alone in a browser context, and assuming an authenticated API is
  therefore protected against a page the user happens to visit (§8 P1).
- Treating `geaflow.analytics.client.access.token` as an enforced authentication
  control, or as anything at all (§9).
- Reading `masked = true` as encryption, redaction, or any server-side protection.
- Running the console in `local` deploy mode, or the evaluation Docker image, as a
  production deployment.
- Granting query submission to a population broader than the one you would grant shell
  access on the engine hosts.
- Assuming console tenant isolation extends to engine state, job output or checkpoints.
- Pointing two tenants' jobs at one state backend and expecting the engine to keep them
  apart.
- Passing credentials through query text, where they enter job configuration and
  metadata.

## §11a Known non-findings (recurring false positives)

**This section is provisional.** Its entries follow from §14 answers given in review,
not from a PPMC vote. It is written down so the PPMC can ratify or reject each entry,
and must not be used as a suppression list until it has.

| Report shape | Proposed disposition | Discharged by | Blocked on |
| --- | --- | --- | --- |
| Any finding in `geaflow-examples/`, `bin/`, `data/`, `tools/` | `OUT-OF-MODEL: unsupported-component` | §3 | ratification |
| Insecure defaults in `geaflow.deploy.mode=local`, including the all-in-one image | `OUT-OF-MODEL: unsupported-component` | §3 | ratification |
| Anything in the Kubernetes operator's RBAC posture | `OUT-OF-MODEL: unsupported-component`, pending its own model | §3 | ratification |
| "Endpoint X requires no authentication", for an engine port | `OUT-OF-MODEL: adversary-not-in-scope` | §7 | ratification |
| "Unsafe deserialization reachable from the shuffle or RPC channel" | `OUT-OF-MODEL: adversary-not-in-scope` | §4, §7 | ratification |
| "Unsafe deserialization of state read back from a store" | **not** a known non-finding. Route on who can write the store | §4 | none |
| "This query exhausts cluster memory" or "the result set is unbounded" | `BY-DESIGN: property-disclaimed` | §9 | ratification |
| "Job endpoints are published on every node by default" | `OUT-OF-MODEL: non-default-build` | §5a | ratification |
| "Connector credentials appear in job configuration" | `BY-DESIGN: property-disclaimed` | §9 | none |
| "No TLS on inter-node traffic" | `BY-DESIGN: property-disclaimed`, and a roadmap item | §9 | ratification |
| "Timing differences in token or password comparison" | `BY-DESIGN: property-disclaimed` | §3, §9 | ratification |
| CORS on `/api/**` | **not** a known non-finding. Open, §14 Q15 | | Q15 |

## §12 Conditions that would change this model

Revise when any of the following happens:

- A new network listener, or authentication added to an existing one.
- A change of default for any §5a knob, including a change to how a deployment target
  overrides one.
- A new connector, or a change to how table properties merge with server configuration.
- A change to the console's CORS policy, or to where a session token may be presented.
- A new deployment shape, or promotion of the operator, MCP or AI surfaces into the
  supported perimeter.
- **Each release, for the `geaflow-mcp` and `geaflow-ai` exclusions specifically.** They
  are excluded as of the bound commit, not permanently (§3), and an expiring exclusion
  that is never revisited becomes a standing one by neglect.
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

## §14 Questions and answers

The first draft posed fourteen questions. All fourteen were answered during the ASF
Security Team review, and their consequences are already folded into the sections above;
this section records the answers and where each landed, so a reader can audit the
reasoning rather than take the body on faith.

**These answers are `*(review)*`, not `*(maintainer)*`.** They are a reviewer's reading
of the code, sourced and checked, but the PPMC has not voted on any of them. Ratifying
this section is what turns the document from a description into a policy.

### Wave 1: scope and posture, answered

**Q1. Is the cluster network a trust boundary? No.** There is no authentication code
path on any engine listener, not even a disabled one: the analytics handler only sets
CORS headers, the gRPC client hardcodes `usePlaintext()`, and brpc and shuffle carry
Kryo with registration off. Apache Spark and Apache Flink document the same posture. A
report of "endpoint X is unauthenticated" is `OUT-OF-MODEL: adversary-not-in-scope`, and
the obligation moves to §10.
*Landed in:* §4, §5, §7, §9, §10 item 2, §11a.

**Q2. Is submitting a query equivalent to executing code? Yes**, by three independent
routes, any one sufficient: `CREATE FUNCTION` class loading, console UDF upload onto the
engine classpath, and query `WITH` properties overriding global configuration.
*Landed in:* §2 (as its own paragraph), §4, §6, §9, §10 item 1.

**Q3. Are peers trusted? Yes, but the claim splits in two.** Trusting peers is right for
shuffle and RPC: one image, one operator, no membership concept to hang an adversary on.
It is not right for state and checkpoint stores, which outlive the job and can be written
by something that was never a peer. The first draft lumped them together, which would
have turned "we trust our peers" into "we trust anything ever written to a checkpoint
path".
*Landed in:* §4 point 3, §7 (new adversary row), §9.

**Q4. What is the intended posture of the agent and dashboard endpoints? Diagnostic
surfaces**, on an operator-controlled network. The first draft's premise was wrong: the
master's agent *is* gated, by `geaflow.http.rest.service.enable`. Two things do not close
with this answer and are carried forward as Q4a and Q4b below.
*Landed in:* §5, §5a.

**Q5. Is `kubernetes.service.exposed.type=NODE_PORT` the supported production default?
No.** It is an evaluation convenience, so a report against it is
`OUT-OF-MODEL: non-default-build`. The reviewer's recommendation goes further: change the
shipped default to `CLUSTER_IP` (`KubernetesConfigKeys.java:74`), since under Q1 and Q2
the current default publishes unauthenticated code execution on every node address, and
defaults are what people actually deploy. That is an engine-repository change, tracked as
a follow-up rather than made here.
*Landed in:* §5a, §10 item 6 (now unconditional), §11a, §13.

### Wave 2: properties and limits, answered

**Q6. Where is the line on resource consumption? There is no line, and none is
intended.** Given Q2, a resource-exhaustion report from someone entitled to submit
queries is not a vulnerability; they could call `System.exit(0)` in a UDF instead. It
would escalate only if reachable from a client the model does not trust, which Q1 rules
out. Disposition `BY-DESIGN: property-disclaimed`. A categorical answer beats a number,
because it does not need revising every release.
*Landed in:* §8 P4 (narrowed to validation alone), §9, §11a.

**Q7. Is the out-of-scope list right? Yes**, with three refinements. The operator case is
stronger on the merits than the draft made it: cluster-scoped wildcard RBAC over six API
groups including Secrets, and that is the default install path. `geaflow-mcp` and
`geaflow-ai` get an expiring exclusion rather than a standing one, with a §12 trigger.
The demo-image carve-out attaches to `geaflow.deploy.mode=local` rather than to the
Dockerfiles, since local mode is what starts embedded datastores with bundled credentials
and it is reachable outside those images. `tools/` is now named.
*Landed in:* §3, §11a, §12.

**Q8. Does tenant isolation extend below the console? No.** Nothing in the engine carries
a tenant identity: it is console database rows plus the token resolved at the auth
interceptor, and job configuration arrives as a flat `geaflow.*` map with no tenant field.
The negative belongs inside P2, where integrators will actually read it, not in a trailing
condition.
*Landed in:* §8 P2, §9, §11.

**Q9. Are side channels out of scope? Yes, entirely.** GeaFlow implements no cryptography
of its own. The corollary is worth naming so that reports are answered before they are
filed: token and password comparison is ordinary equality.
*Landed in:* §3, §9, §11a.

### Wave 3: confirmations and meta, answered

**Q10. What is assumed of the backing MySQL, Redis, InfluxDB and DFS?** That the operator
access-controls them and that GeaFlow trusts what it reads back, **and** that the operator
provides their transport security: the console's default JDBC URL hardcodes
`&useSSL=false`.
*Landed in:* §5, §10 item 10.

**Q11. Is the absence of TLS deliberate, or simply not yet built? Not yet built**, and the
document says both things at once. There is no TLS configuration surface anywhere, no
keystore or truststore keys, no `server.ssl.*`, plus `usePlaintext()` and `useSSL=false`
hardcoded. A deliberate decision normally leaves a disabled switch behind, and there is
none. So: disclaimed for the model as it stands, meaning a TLS report closes
`BY-DESIGN: property-disclaimed`, **and** filed as a roadmap item rather than won't-fix.
The first half alone would read as a design stance the project has not actually taken.
*Landed in:* §9, §11a.

**Q12. What should happen to `geaflow.analytics.client.access.token`? Remove it.** It is
not merely unenforced, it is never read: three hits repository-wide, all inside its own
declaration. Review also found that the JDBC `accesstoken` connect property, initially
thought to be the working client-side counterpart, is likewise parsed and dropped. A key
called `...access.token` described as "for auth" that nothing consumes is worth less than
nothing, and removing it is a smaller change than documenting it. If config keys are
frozen before graduation, change the description string at minimum. Engine-repository
change, tracked as a follow-up.
*Landed in:* §9 false friends, §11.

**Q13. Is `masked = true` a UI hint? Yes.** `ConfigDescItem.java:80` copies it into a
descriptor the console serves for rendering; four production fields carry it; nothing
touches storage. Worth adding, since "masked" invites the opposite reading: the values
are stored *and transmitted* in the clear, and the browser is the only thing that hides
them.
*Landed in:* §9 false friends, §11.

**Q14. Where should this document live, and who owns it? Here**, on the project website,
revised per §12, ratified by PPMC vote, with the trigger list as it stands. One of the two
stated conditions is met: apache/geaflow#828 is merged. The other is not; see the
residual item below. On a Chinese translation, the recommendation is not to maintain one:
§12 designs this document to change, and a stale translated threat model is worse than
none.

### Still open

**Q4a. Should `Supervisor.startAgent()` honour an enable flag, the way the master path
does?** `AbstractMaster` checks `geaflow.http.rest.service.enable` before starting its
agent; `Supervisor.start()` does not, and retries three times if the agent fails to bind.
On Kubernetes the supervisor is on by default, so every worker runs an agent that
`geaflow.http.rest.service.enable=false` does not reach. Not a vulnerability under Q1, but
an inconsistency the project has not chosen deliberately.

**Q4b. Is the supervisor `restart(pid)` RPC intended as a supported control surface?** It
is control plane rather than diagnostics: it stops and restarts the worker, the PID comes
from the caller, and it is on by default on the primary deployment target. The Q4 answer
covers the agent and the dashboard; this endpoint should be dispositioned separately.

**Q15 (new). Is the console's CORS policy intentional?** `addMapping("/**")` with
`allowedOriginPatterns("*")` and `allowCredentials(true)`, over an API whose session token
is accepted from a cookie, means any origin can issue credentialed requests to `/api/**`
and read the responses. `OPTIONS` bypasses the auth interceptor, and error responses
reflect `Origin` with credentials allowed. This is the one substantive gap the review
surfaced rather than a correction to the draft, and it is the only item here with no
proposed disposition. It most likely wants a `VALID-HARDENING`-shaped answer.

**Q16 (new). When will GeaFlow be listed at
[security.apache.org/projects](https://security.apache.org/projects/)?** The entire Q1
posture depends on the ASF Security Team being able to close out-of-model reports without
pulling in the PPMC for each one. Being listed is what lets that happen, and so it is what
makes this document pay off in practice. Track it as an action item alongside
ratification, not as a documentation question.

**Q17 (new). The two remaining `*(inferred)*` claims.** Everything else in the document is
now either cited or attributed to the review; these two are not, and are listed here so
that no inferred claim sits in the document without a matching question.

- §5, the negative inventory of what GeaFlow does to its host: that it does not install
  signal handlers, mutate global locale or FPU state, or read the environment beyond
  documented deployment variables. Negative claims of this shape are the hardest to
  establish by reading code and the easiest for a maintainer to confirm outright.
- §8 P4, that malformed or ill-typed GQL is rejected rather than mis-planned. Nobody has
  confirmed the parser and planner behave this way, and P4 is the only §8 property resting
  on inference.

**Q14 residual: nothing links here.** `community/en/security.md` is still a five-line
stub, so this model is reachable only from the sidebar. It will not appear under
`/community/zh` at all: `zh-community` is a separate Docusaurus plugin instance rooted at
`community/zh` with its own autogenerated sidebar (`docusaurus.config.ts:93-96`). Filling
the English Security page to link here, and pointing the Chinese one at the English page,
was Q14's second condition and is not yet done.

### Provenance count

Counted over this document: **31 documented / 0 maintainer / 29 review / 2 inferred.**
The first draft was 20 documented / 0 maintainer / 30 inferred. What changed is not that
the project decided anything, it is that a reviewer read the code: claims that were
guesses are now either cited or attributed. The zero in the maintainer column is the
number that matters, and it is what §14 exists to change.

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
