import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  ByteSize: { input: any; output: any; }
  DateTime: { input: any; output: any; }
  DevDomainName: { input: any; output: any; }
  EnvironmentVariableEnvironment: { input: any; output: any; }
  JSON: { input: any; output: any; }
  JSONObject: { input: any; output: any; }
  SubmissionAndroidTrack: { input: any; output: any; }
  WorkerDeploymentIdentifier: { input: any; output: any; }
  WorkerDeploymentRequestID: { input: any; output: any; }
};

export type AccessTokenScopeInput = {
  /**
   * The account this scope applies to. Required for ACCOUNT scopes and must be omitted for
   * ALL_ACCOUNTS scopes.
   */
  accountID?: InputMaybe<Scalars['ID']['input']>;
  permissions: Array<Permission>;
  type: AccessTokenScopeType;
};

export enum AccessTokenScopeType {
  /** One account, named by accountID, narrowed to the scope's permissions. */
  Account = 'ACCOUNT',
  /**
   * Every account the token's owner has permissions on at request time, narrowed to the
   * scope's permissions.
   */
  AllAccounts = 'ALL_ACCOUNTS'
}

export type AccountAppsFilterInput = {
  searchTerm?: InputMaybe<Scalars['String']['input']>;
  sortByField: AccountAppsSortByField;
};

export enum AccountAppsSortByField {
  LatestActivityTime = 'LATEST_ACTIVITY_TIME',
  /**
   * Name prefers the display name but falls back to full_name with @account/
   * part stripped.
   */
  Name = 'NAME'
}

export type AccountDataInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  userSpecifiedAccountUsage?: InputMaybe<UserSpecifiedAccountUsage>;
};

export type AccountDeviceRunSessionFilterInput = {
  statuses?: InputMaybe<Array<DeviceRunSessionStatus>>;
};

/** Filter for account member types in membersPaginated query */
export enum AccountMemberType {
  /** All members (default) */
  All = 'ALL',
  /** Human members (Users + SSOUsers) */
  Human = 'HUMAN',
  /** Robot members only */
  Robot = 'ROBOT',
  /** SSO users only */
  SsoUser = 'SSO_USER'
}

export type AccountMembersFilterInput = {
  /** Filter by members containing all of the specified permissions. */
  exactPermissions?: InputMaybe<Array<Permission>>;
  /**
   * Filter members by 2FA status. Only regular users are returned when set, since SSO users
   * and robots don't have 2FA. Requires admin permission on the account.
   */
  isSecondFactorAuthenticationEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Case-insensitive substring match on username, email, and name */
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};

export type AccountNotificationPreferenceInput = {
  accountId: Scalars['ID']['input'];
  enabled: Scalars['Boolean']['input'];
  event: NotificationEvent;
  type: NotificationType;
};

export type AccountSsoConfigurationData = {
  authProtocol: AuthProtocolType;
  authProviderIdentifier: AuthProviderIdentifier;
  clientIdentifier: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  issuer: Scalars['String']['input'];
};

export enum AccountUploadSessionType {
  ProfileImageUpload = 'PROFILE_IMAGE_UPLOAD',
  WorkflowsProjectSources = 'WORKFLOWS_PROJECT_SOURCES'
}

export enum ActivityTimelineProjectActivityType {
  Build = 'BUILD',
  DeviceRunSession = 'DEVICE_RUN_SESSION',
  Submission = 'SUBMISSION',
  Update = 'UPDATE',
  Worker = 'WORKER',
  WorkflowRun = 'WORKFLOW_RUN'
}

export enum AgentKind {
  ClaudeCode = 'CLAUDE_CODE',
  Codex = 'CODEX'
}

export enum AgentProvider {
  Anthropic = 'ANTHROPIC',
  Openai = 'OPENAI'
}

export enum AgentProviderConnectionAuthorizationStatus {
  Expired = 'EXPIRED',
  Pending = 'PENDING',
  Succeeded = 'SUCCEEDED'
}

export enum AgentProviderConnectionStatus {
  Invalid = 'INVALID',
  UnableToVerify = 'UNABLE_TO_VERIFY',
  Valid = 'VALID'
}

export type AgentRunFilterInput = {
  agentKinds?: InputMaybe<Array<AgentKind>>;
  statuses?: InputMaybe<Array<JobRunStatus>>;
};

/** @isDefault: if set, these build credentials will become the default for the Android app. All other build credentials will have their default status set to false. */
export type AndroidAppBuildCredentialsInput = {
  isDefault: Scalars['Boolean']['input'];
  keystoreId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export type AndroidAppCredentialsFilter = {
  applicationIdentifier?: InputMaybe<Scalars['String']['input']>;
  legacyOnly?: InputMaybe<Scalars['Boolean']['input']>;
};

export type AndroidAppCredentialsInput = {
  fcmId?: InputMaybe<Scalars['ID']['input']>;
  googleServiceAccountKeyForFcmV1Id?: InputMaybe<Scalars['ID']['input']>;
  googleServiceAccountKeyForSubmissionsId?: InputMaybe<Scalars['ID']['input']>;
};

export enum AndroidBuildType {
  Apk = 'APK',
  AppBundle = 'APP_BUNDLE',
  /** @deprecated Use developmentClient option instead. */
  DevelopmentClient = 'DEVELOPMENT_CLIENT'
}

export type AndroidBuilderEnvironmentInput = {
  bun?: InputMaybe<Scalars['String']['input']>;
  corepack?: InputMaybe<Scalars['Boolean']['input']>;
  env?: InputMaybe<Scalars['JSONObject']['input']>;
  expoCli?: InputMaybe<Scalars['String']['input']>;
  image?: InputMaybe<Scalars['String']['input']>;
  ndk?: InputMaybe<Scalars['String']['input']>;
  node?: InputMaybe<Scalars['String']['input']>;
  pnpm?: InputMaybe<Scalars['String']['input']>;
  yarn?: InputMaybe<Scalars['String']['input']>;
};

export type AndroidFcmInput = {
  credential: Scalars['String']['input'];
  version: AndroidFcmVersion;
};

export enum AndroidFcmVersion {
  Legacy = 'LEGACY',
  V1 = 'V1'
}

export type AndroidJobBuildCredentialsInput = {
  keystore: AndroidJobKeystoreInput;
};

export type AndroidJobInput = {
  applicationArchivePath?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated */
  artifactPath?: InputMaybe<Scalars['String']['input']>;
  buildArtifactPaths?: InputMaybe<Array<Scalars['String']['input']>>;
  buildProfile?: InputMaybe<Scalars['String']['input']>;
  buildType?: InputMaybe<AndroidBuildType>;
  builderEnvironment?: InputMaybe<AndroidBuilderEnvironmentInput>;
  cache?: InputMaybe<BuildCacheInput>;
  customBuildConfig?: InputMaybe<CustomBuildConfigInput>;
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  environment?: InputMaybe<Scalars['EnvironmentVariableEnvironment']['input']>;
  experimental?: InputMaybe<Scalars['JSONObject']['input']>;
  gradleCommand?: InputMaybe<Scalars['String']['input']>;
  loggerLevel?: InputMaybe<WorkerLoggerLevel>;
  mode?: InputMaybe<BuildMode>;
  projectArchive: ProjectArchiveSourceInput;
  projectRootDirectory: Scalars['String']['input'];
  releaseChannel?: InputMaybe<Scalars['String']['input']>;
  secrets?: InputMaybe<AndroidJobSecretsInput>;
  triggeredBy?: InputMaybe<BuildTrigger>;
  type: BuildWorkflow;
  updates?: InputMaybe<BuildUpdatesInput>;
  username?: InputMaybe<Scalars['String']['input']>;
  version?: InputMaybe<AndroidJobVersionInput>;
};

export type AndroidJobKeystoreInput = {
  dataBase64: Scalars['String']['input'];
  keyAlias: Scalars['String']['input'];
  keyPassword?: InputMaybe<Scalars['String']['input']>;
  keystorePassword: Scalars['String']['input'];
};

export type AndroidJobOverridesInput = {
  applicationArchivePath?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated */
  artifactPath?: InputMaybe<Scalars['String']['input']>;
  buildArtifactPaths?: InputMaybe<Array<Scalars['String']['input']>>;
  buildProfile?: InputMaybe<Scalars['String']['input']>;
  buildType?: InputMaybe<AndroidBuildType>;
  builderEnvironment?: InputMaybe<AndroidBuilderEnvironmentInput>;
  cache?: InputMaybe<BuildCacheInput>;
  customBuildConfig?: InputMaybe<CustomBuildConfigInput>;
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  experimental?: InputMaybe<Scalars['JSONObject']['input']>;
  gradleCommand?: InputMaybe<Scalars['String']['input']>;
  loggerLevel?: InputMaybe<WorkerLoggerLevel>;
  mode?: InputMaybe<BuildMode>;
  releaseChannel?: InputMaybe<Scalars['String']['input']>;
  secrets?: InputMaybe<AndroidJobSecretsInput>;
  updates?: InputMaybe<BuildUpdatesInput>;
  username?: InputMaybe<Scalars['String']['input']>;
  version?: InputMaybe<AndroidJobVersionInput>;
};

export type AndroidJobSecretsInput = {
  buildCredentials?: InputMaybe<AndroidJobBuildCredentialsInput>;
};

export type AndroidJobVersionInput = {
  versionCode: Scalars['String']['input'];
};

export type AndroidKeystoreInput = {
  base64EncodedKeystore: Scalars['String']['input'];
  keyAlias: Scalars['String']['input'];
  keyPassword?: InputMaybe<Scalars['String']['input']>;
  keystorePassword: Scalars['String']['input'];
};

export enum AndroidKeystoreType {
  Jks = 'JKS',
  Pkcs12 = 'PKCS12',
  Unknown = 'UNKNOWN'
}

export type AndroidSubmissionConfigInput = {
  applicationIdentifier?: InputMaybe<Scalars['String']['input']>;
  changelog?: InputMaybe<Scalars['String']['input']>;
  changesNotSentForReview?: InputMaybe<Scalars['Boolean']['input']>;
  googleServiceAccountKeyId?: InputMaybe<Scalars['String']['input']>;
  googleServiceAccountKeyJson?: InputMaybe<Scalars['String']['input']>;
  isVerboseFastlaneEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  releaseStatus?: InputMaybe<SubmissionAndroidReleaseStatus>;
  rollout?: InputMaybe<Scalars['Float']['input']>;
  track: Scalars['SubmissionAndroidTrack']['input'];
};

export type AppDataInput = {
  id: Scalars['ID']['input'];
  internalDistributionBuildPrivacy?: InputMaybe<AppInternalDistributionBuildPrivacy>;
  privacy?: InputMaybe<Scalars['String']['input']>;
};

export type AppInfoInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
};

export type AppInput = {
  accountId: Scalars['ID']['input'];
  appInfo?: InputMaybe<AppInfoInput>;
  projectName: Scalars['String']['input'];
};

export enum AppInternalDistributionBuildPrivacy {
  Private = 'PRIVATE',
  Public = 'PUBLIC'
}

export type AppNotificationPreferenceInput = {
  appId: Scalars['ID']['input'];
  enabled: Scalars['Boolean']['input'];
  event: NotificationEvent;
  type: NotificationType;
};

export type AppObserveCustomEventListFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceOsVersion?: InputMaybe<Scalars['String']['input']>;
  easClientId?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Restrict to one error group. Combine with the exception eventName to list a group's occurrences. */
  errorFingerprint?: InputMaybe<Scalars['String']['input']>;
  eventName?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  propertyFilters?: InputMaybe<Array<AppObserveCustomEventPropertyFilter>>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type AppObserveCustomEventListOrderBy = {
  direction: AppObserveEventsOrderByDirection;
  field: AppObserveCustomEventListOrderByField;
};

export enum AppObserveCustomEventListOrderByField {
  Timestamp = 'TIMESTAMP'
}

export type AppObserveCustomEventNamesOrderBy = {
  direction: AppObserveCustomEventNamesOrderByDirection;
  field: AppObserveCustomEventNamesOrderByField;
};

export enum AppObserveCustomEventNamesOrderByDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum AppObserveCustomEventNamesOrderByField {
  Count = 'COUNT',
  EventName = 'EVENT_NAME'
}

export type AppObserveCustomEventPropertyFilter = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type AppObserveEasUpdatesFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveEasUpdatesOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveUpdatesOrderByField;
};

export type AppObserveEngagementInput = {
  /** Series bucket size. Defaults to one day. */
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export enum AppObserveErrorBreakdownDimension {
  AppVersion = 'APP_VERSION',
  Country = 'COUNTRY',
  Device = 'DEVICE',
  Os = 'OS'
}

/** Filters for the per-group breakdown. Same release/time/platform filters used across Observe. */
export type AppObserveErrorGroupBreakdownInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  dimension: AppObserveErrorBreakdownDimension;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  fingerprint: Scalars['String']['input'];
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one error kind (JS errors, native crashes, or other *.exception events). */
  kind?: InputMaybe<AppObserveErrorKind>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveErrorGroupsInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  /** Bucket width in minutes for the per-group timeSeries field. Only used when timeSeries is selected. Defaults to 1440 (daily). */
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  /** Restrict to errors reported with this error code (the expo.error.code attribute). */
  code?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Restrict to a single group, e.g. to fetch one group's header on the detail page. */
  fingerprint?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one error kind (JS errors, native crashes, or other *.exception events). */
  kind?: InputMaybe<AppObserveErrorKind>;
  orderBy?: InputMaybe<AppObserveErrorGroupsOrderBy>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  /** Restrict to fatal-only or non-fatal-only errors. */
  severity?: InputMaybe<AppObserveErrorSeverity>;
  /** Restrict to a capture source (e.g. global). */
  source?: InputMaybe<Scalars['String']['input']>;
  startTime: Scalars['DateTime']['input'];
};

export enum AppObserveErrorGroupsOrderBy {
  FirstSeen = 'FIRST_SEEN',
  LastSeen = 'LAST_SEEN',
  MostFrequent = 'MOST_FREQUENT',
  MostUsers = 'MOST_USERS'
}

/** JS covers both the legacy exception name and js.exception. NATIVE is native.exception. OTHER is any other *.exception event. */
export enum AppObserveErrorKind {
  Js = 'JS',
  Native = 'NATIVE',
  Other = 'OTHER'
}

export type AppObserveErrorOccurrencesFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  easClientId?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Restrict to one error group. */
  fingerprint?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one error kind (JS errors, native crashes, or other *.exception events). */
  kind?: InputMaybe<AppObserveErrorKind>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type AppObserveErrorOccurrencesOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveErrorOccurrencesOrderByField;
};

export enum AppObserveErrorOccurrencesOrderByField {
  Timestamp = 'TIMESTAMP'
}

export enum AppObserveErrorSeverity {
  Error = 'ERROR',
  Fatal = 'FATAL'
}

/** Filters for the error-stats header. Same release/time/platform filters used across Observe. */
export type AppObserveErrorStatsInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one error kind (JS errors, native crashes, or other *.exception events). */
  kind?: InputMaybe<AppObserveErrorKind>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

/** Filters for the error time series. Same release/time/platform filters used across Observe, plus the bucket size. */
export type AppObserveErrorTimeSeriesInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  /** Bucket width in minutes. Defaults to 60. */
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Restrict to one error group for the detail page's occurrences-over-time chart. Omit for the overview chart. */
  fingerprint?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one error kind (JS errors, native crashes, or other *.exception events). */
  kind?: InputMaybe<AppObserveErrorKind>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveErrorsBreakdownInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  dimension: AppObserveErrorBreakdownDimension;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  fingerprint: Scalars['String']['input'];
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one error kind (JS errors, native crashes, or other *.exception events). */
  kind?: InputMaybe<AppObserveErrorKind>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveErrorsGroupsInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  /** Bucket size for each group's timeSeries. Defaults to daily. */
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  /** Restrict to errors reported with this error code (the expo.error.code attribute). */
  code?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Restrict to one error group. */
  fingerprint?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one error kind (JS errors, native crashes, or other *.exception events). */
  kind?: InputMaybe<AppObserveErrorKind>;
  orderBy?: InputMaybe<AppObserveErrorGroupsOrderBy>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  severity?: InputMaybe<AppObserveErrorSeverity>;
  source?: InputMaybe<Scalars['String']['input']>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveErrorsStatsInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one error kind (JS errors, native crashes, or other *.exception events). */
  kind?: InputMaybe<AppObserveErrorKind>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveErrorsTimeSeriesInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Restrict to one error group. */
  fingerprint?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one error kind (JS errors, native crashes, or other *.exception events). */
  kind?: InputMaybe<AppObserveErrorKind>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveEventsFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  /** Filter by the update the device was *running* at event time (the app_update_id column). */
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  /** Filter by the update that was *downloaded* (the expo.update_id tag), as surfaced by the EAS Update Recent updates download drill-down. Distinct from appUpdateId (running update); the two are not interchangeable. */
  downloadedUpdateId?: InputMaybe<Scalars['String']['input']>;
  easClientId?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  metricName?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  routeName?: InputMaybe<Scalars['String']['input']>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type AppObserveEventsOrderBy = {
  direction: AppObserveEventsOrderByDirection;
  field: AppObserveEventsOrderByField;
};

export enum AppObserveEventsOrderByDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum AppObserveEventsOrderByField {
  MetricValue = 'METRIC_VALUE',
  Timestamp = 'TIMESTAMP'
}

export type AppObserveFeedbackBreakdownInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceOsVersion?: InputMaybe<Scalars['String']['input']>;
  dimension: AppObserveUserEventBreakdownDimension;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Only these feedback ids, at most 100. Every id when absent. */
  feedbackIds?: InputMaybe<Array<Scalars['String']['input']>>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Maximum buckets to return, 1 to 100. Defaults to 100. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveFeedbackListFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceOsVersion?: InputMaybe<Scalars['String']['input']>;
  easClientId?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Only reports collected under this feedback id. */
  feedbackId?: InputMaybe<Scalars['String']['input']>;
  /** true: only reports with a message; false: only reports with a rating alone. Both when absent. */
  hasMessage?: InputMaybe<Scalars['Boolean']['input']>;
  /** true: only reports with a rating; false: only reports with a message alone. Both when absent. */
  hasRating?: InputMaybe<Scalars['Boolean']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  /** Attributes the app attached to the report, such as a route. At most 5, including feedbackId. */
  propertyFilters?: InputMaybe<Array<AppObserveFeedbackPropertyFilter>>;
  /** Only reports with this rating, a whole number from 0 to 10. */
  rating?: InputMaybe<Scalars['Int']['input']>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveFeedbackListOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveFeedbackListOrderByField;
};

export enum AppObserveFeedbackListOrderByField {
  Timestamp = 'TIMESTAMP'
}

export type AppObserveFeedbackPropertyFilter = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type AppObserveFeedbackSummaryInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceOsVersion?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Only these feedback ids, at most 100. Every id when absent. */
  feedbackIds?: InputMaybe<Array<Scalars['String']['input']>>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Maximum groups to return, 1 to 500. Defaults to 500. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Defaults to the most reported id first. */
  orderBy?: InputMaybe<AppObserveFeedbackSummaryOrderBy>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveFeedbackSummaryOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveFeedbackSummaryOrderByField;
};

export enum AppObserveFeedbackSummaryOrderByField {
  Count = 'COUNT',
  FeedbackId = 'FEEDBACK_ID',
  LastSeen = 'LAST_SEEN'
}

export type AppObserveLogsOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveLogsOrderByField;
};

export enum AppObserveLogsOrderByField {
  Timestamp = 'TIMESTAMP'
}

export type AppObserveMetricTimeSeriesInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Metric name, e.g. `expo.app_startup.tti`. */
  name: Scalars['String']['input'];
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  routeName?: InputMaybe<Scalars['String']['input']>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveMetricsListFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  /** Filter by the update the device was *running* at sample time (the app_update_id column). */
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  /** Filter by the update that was *downloaded* (the expo.update_id tag). Distinct from appUpdateId (running update); the two are not interchangeable. */
  downloadedUpdateId?: InputMaybe<Scalars['String']['input']>;
  easClientId?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Metric name, e.g. `expo.app_startup.tti`. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  routeName?: InputMaybe<Scalars['String']['input']>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type AppObserveMetricsListOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveMetricsListOrderByField;
};

export enum AppObserveMetricsListOrderByField {
  Timestamp = 'TIMESTAMP',
  Value = 'VALUE'
}

export type AppObserveNavigationFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  routeNames?: InputMaybe<Array<Scalars['String']['input']>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveNavigationOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveNavigationRoutesOrderByField;
};

export type AppObserveNavigationRoutesFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  routeNames?: InputMaybe<Array<Scalars['String']['input']>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveNavigationRoutesOrderBy = {
  direction: AppObserveEventsOrderByDirection;
  field: AppObserveNavigationRoutesOrderByField;
};

export enum AppObserveNavigationRoutesOrderByField {
  MedianColdTtr = 'MEDIAN_COLD_TTR',
  MedianTti = 'MEDIAN_TTI',
  MedianWarmTtr = 'MEDIAN_WARM_TTR',
  NavigationCount = 'NAVIGATION_COUNT',
  P90ColdTtr = 'P90_COLD_TTR',
  P90Tti = 'P90_TTI',
  P90WarmTtr = 'P90_WARM_TTR',
  RouteName = 'ROUTE_NAME'
}

export enum AppObserveOrderDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Engagement-band filters. No release filters: the band always spans all versions. */
export type AppObserveOverviewEngagementInput = {
  /** Series bucket size. Defaults to one day. */
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

/** Stability-tile filters. No release filters: the tiles always span all versions. */
export type AppObserveOverviewStabilityInput = {
  /** Series bucket size. Defaults to one day. */
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveOverviewUpdateComparisonInput = {
  appVersion: Scalars['String']['input'];
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Metric names to aggregate. Defaults to all metrics available on the account's plan. */
  metricNames?: InputMaybe<Array<Scalars['String']['input']>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveOverviewVersionComparisonInput = {
  /** Versions to compare (max 10, any order). Defaults to the two highest versions. */
  appVersions?: InputMaybe<Array<Scalars['String']['input']>>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Metric names to aggregate. Defaults to all metrics available on the account's plan. */
  metricNames?: InputMaybe<Array<Scalars['String']['input']>>;
  startTime: Scalars['DateTime']['input'];
};

export enum AppObservePlatform {
  Android = 'ANDROID',
  Ios = 'IOS',
  Ipados = 'IPADOS',
  Macos = 'MACOS',
  Tvos = 'TVOS'
}

export enum AppObservePropertyType {
  Boolean = 'BOOLEAN',
  Json = 'JSON',
  Number = 'NUMBER',
  String = 'STRING'
}

export type AppObserveReleasesInput = {
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  metricNames?: InputMaybe<Array<Scalars['String']['input']>>;
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

/** Filters for the spans of one session. The session already bounds the query. */
export type AppObserveSessionSpanFilter = {
  hosts?: InputMaybe<Array<Scalars['String']['input']>>;
  httpStatusCodes?: InputMaybe<Array<Scalars['Int']['input']>>;
  kinds?: InputMaybe<Array<AppObserveSpanKind>>;
  minDurationMs?: InputMaybe<Scalars['Float']['input']>;
  names?: InputMaybe<Array<Scalars['String']['input']>>;
  rootOnly?: InputMaybe<Scalars['Boolean']['input']>;
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
  statusCodes?: InputMaybe<Array<AppObserveSpanStatusCode>>;
};

export type AppObserveSpanAttributeFilter = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export enum AppObserveSpanKind {
  Client = 'CLIENT',
  Consumer = 'CONSUMER',
  Internal = 'INTERNAL',
  Producer = 'PRODUCER',
  Server = 'SERVER',
  Unspecified = 'UNSPECIFIED'
}

export type AppObserveSpanListFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  /** At most 5. Matches spans whose attribute has exactly this value. */
  attributeFilters?: InputMaybe<Array<AppObserveSpanAttributeFilter>>;
  easClientId?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** HTTP request spans to any of these hosts. */
  hosts?: InputMaybe<Array<Scalars['String']['input']>>;
  /** HTTP request spans with any of these response status codes. */
  httpStatusCodes?: InputMaybe<Array<Scalars['Int']['input']>>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  kinds?: InputMaybe<Array<AppObserveSpanKind>>;
  minDurationMs?: InputMaybe<Scalars['Float']['input']>;
  /** Span names, such as GET or POST. The cheapest filter: span name is in the table's sort key. */
  names?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  /** Only spans with no parent. */
  rootOnly?: InputMaybe<Scalars['Boolean']['input']>;
  /** Spans produced by any of these instrumentation scopes, such as expo-observe.network. */
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  startTime: Scalars['DateTime']['input'];
  statusCodes?: InputMaybe<Array<AppObserveSpanStatusCode>>;
  /** 32-character hex trace id. */
  traceId?: InputMaybe<Scalars['String']['input']>;
};

export type AppObserveSpanListOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveSpanListOrderByField;
};

export enum AppObserveSpanListOrderByField {
  StartTimestamp = 'START_TIMESTAMP'
}

export type AppObserveSpanNamesInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Maximum names to return, 1 to 500. Defaults to 100. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  /** Spans produced by any of these instrumentation scopes, such as expo-observe.network. */
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
  startTime: Scalars['DateTime']['input'];
};

export enum AppObserveSpanStatusCode {
  Error = 'ERROR',
  Ok = 'OK',
  Unset = 'UNSET'
}

/** Stability-tile filters. No release filters: the tiles always span all versions. */
export type AppObserveStabilityInput = {
  /** Series bucket size. Defaults to one day. */
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveTimeSeriesInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  metricName: Scalars['String']['input'];
  platform?: InputMaybe<AppObservePlatform>;
  /** Filter to these platforms. Cannot be set together with platform. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  routeName?: InputMaybe<Scalars['String']['input']>;
  startTime: Scalars['DateTime']['input'];
};

export enum AppObserveUpdatesOrderByField {
  DownloadCount = 'DOWNLOAD_COUNT',
  FirstSeenAt = 'FIRST_SEEN_AT',
  MedianDownloadTime = 'MEDIAN_DOWNLOAD_TIME',
  P90DownloadTime = 'P90_DOWNLOAD_TIME'
}

export enum AppObserveUserEventBreakdownDimension {
  AppVersion = 'APP_VERSION',
  Country = 'COUNTRY',
  Device = 'DEVICE',
  Os = 'OS',
  OsVersion = 'OS_VERSION',
  User = 'USER'
}

export type AppObserveUserEventBreakdownInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceOsVersion?: InputMaybe<Scalars['String']['input']>;
  dimension: AppObserveUserEventBreakdownDimension;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Maximum buckets to return, 1 to 100. Defaults to 100. */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Event name. The reserved `exception` name is rejected. */
  name: Scalars['String']['input'];
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveUserEventCountsInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  /** Bucket width. Defaults to 60. The range must not exceed 2000 buckets. */
  bucketIntervalMinutes?: InputMaybe<Scalars['Int']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceOsVersion?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Event names to count. At most 10; the reserved `exception` name is rejected. */
  names: Array<Scalars['String']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveUserEventListFilter = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  deviceModel?: InputMaybe<Scalars['String']['input']>;
  deviceOsVersion?: InputMaybe<Scalars['String']['input']>;
  easClientId?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Event name. The reserved `exception` name is rejected; errors live in the errors namespace. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  propertyFilters?: InputMaybe<Array<AppObserveUserEventPropertyFilter>>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type AppObserveUserEventListOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveUserEventListOrderByField;
};

export enum AppObserveUserEventListOrderByField {
  Timestamp = 'TIMESTAMP'
}

export type AppObserveUserEventNamesInput = {
  appBuildNumber?: InputMaybe<Scalars['String']['input']>;
  appEasBuildId?: InputMaybe<Scalars['String']['input']>;
  appUpdateId?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['DateTime']['input'];
  environment?: InputMaybe<Scalars['String']['input']>;
  isEmbeddedUpdate?: InputMaybe<Scalars['Boolean']['input']>;
  orderBy?: InputMaybe<AppObserveUserEventNamesOrderBy>;
  /** Filter to these platforms. */
  platforms?: InputMaybe<Array<AppObservePlatform>>;
  startTime: Scalars['DateTime']['input'];
};

export type AppObserveUserEventNamesOrderBy = {
  direction: AppObserveOrderDirection;
  field: AppObserveUserEventNamesOrderByField;
};

export enum AppObserveUserEventNamesOrderByField {
  Count = 'COUNT',
  FirstSeen = 'FIRST_SEEN',
  LastSeen = 'LAST_SEEN',
  Name = 'NAME'
}

export type AppObserveUserEventPropertyFilter = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export enum AppPlatform {
  Android = 'ANDROID',
  Ios = 'IOS'
}

export enum AppPrivacy {
  Hidden = 'HIDDEN',
  Public = 'PUBLIC',
  Unlisted = 'UNLISTED'
}

export enum AppProfileImageWidth {
  ExtraLarge = 'EXTRA_LARGE',
  Large = 'LARGE',
  Medium = 'MEDIUM',
  Small = 'SMALL'
}

export type AppStoreConnectApiKeyInput = {
  appleTeamId?: InputMaybe<Scalars['ID']['input']>;
  /**
   * Omit for individual (user-scoped) keys, which have no issuer ID and only
   * support submissions.
   */
  issuerIdentifier?: InputMaybe<Scalars['String']['input']>;
  keyIdentifier: Scalars['String']['input'];
  keyP8: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<Array<AppStoreConnectUserRole>>;
};

export type AppStoreConnectApiKeyUpdateInput = {
  appleTeamId?: InputMaybe<Scalars['ID']['input']>;
};

export type AppStoreConnectAppInput = {
  appId: Scalars['ID']['input'];
  appStoreConnectApiKeyId: Scalars['ID']['input'];
  ascAppIdentifier: Scalars['String']['input'];
};

export enum AppStoreConnectBuildProcessingState {
  Failed = 'FAILED',
  Invalid = 'INVALID',
  Processing = 'PROCESSING',
  Valid = 'VALID'
}

export enum AppStoreConnectBuildUploadState {
  AwaitingUpload = 'AWAITING_UPLOAD',
  Complete = 'COMPLETE',
  Failed = 'FAILED',
  Processing = 'PROCESSING'
}

export enum AppStoreConnectUserRole {
  AccessToReports = 'ACCESS_TO_REPORTS',
  AccountHolder = 'ACCOUNT_HOLDER',
  Admin = 'ADMIN',
  AppManager = 'APP_MANAGER',
  CloudManagedAppDistribution = 'CLOUD_MANAGED_APP_DISTRIBUTION',
  CloudManagedDeveloperId = 'CLOUD_MANAGED_DEVELOPER_ID',
  CreateApps = 'CREATE_APPS',
  CustomerSupport = 'CUSTOMER_SUPPORT',
  Developer = 'DEVELOPER',
  Finance = 'FINANCE',
  ImageManager = 'IMAGE_MANAGER',
  Marketing = 'MARKETING',
  ReadOnly = 'READ_ONLY',
  Sales = 'SALES',
  Technical = 'TECHNICAL',
  Unknown = 'UNKNOWN'
}

/** Whether a project has an App Store Connect connection for its ASC-triggered workflows. */
export enum AppStoreConnectWorkflowConnectionStatus {
  /** An App Store Connect app connection is linked to this project. */
  HasWorkflowsIsConnected = 'HAS_WORKFLOWS_IS_CONNECTED',
  /** The project has App Store Connect-triggered workflows but no connection. */
  HasWorkflowsMissingConnection = 'HAS_WORKFLOWS_MISSING_CONNECTION',
  /** The project has no workflows with an on.app_store_connect trigger. */
  NoAppStoreConnectWorkflows = 'NO_APP_STORE_CONNECT_WORKFLOWS'
}

export enum AppUploadSessionType {
  ProfileImageUpload = 'PROFILE_IMAGE_UPLOAD'
}

export type AppVersionInput = {
  appId: Scalars['ID']['input'];
  applicationIdentifier: Scalars['String']['input'];
  buildVersion: Scalars['String']['input'];
  platform: AppPlatform;
  runtimeVersion?: InputMaybe<Scalars['String']['input']>;
  storeVersion: Scalars['String']['input'];
};

export type AppWithGithubRepositoryInput = {
  accountId: Scalars['ID']['input'];
  appInfo?: InputMaybe<AppInfoInput>;
  installationIdentifier?: InputMaybe<Scalars['String']['input']>;
  projectName: Scalars['String']['input'];
};

export type AppWorkflowFilterInput = {
  requestedGitRef?: InputMaybe<Scalars['String']['input']>;
};

export type AppWorkflowRunFilterInput = {
  requestedGitRef?: InputMaybe<Scalars['String']['input']>;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<WorkflowRunStatus>;
  timeRange?: InputMaybe<WorkflowRunTimeRangeInput>;
  workflowId?: InputMaybe<Scalars['ID']['input']>;
};

export type AppWorkflowRunTimeRangeInput = {
  earliest?: InputMaybe<Scalars['DateTime']['input']>;
  latest?: InputMaybe<Scalars['DateTime']['input']>;
};

export type AppleAppIdentifierInput = {
  appleTeamId?: InputMaybe<Scalars['ID']['input']>;
  bundleIdentifier: Scalars['String']['input'];
  parentAppleAppId?: InputMaybe<Scalars['ID']['input']>;
};

export enum AppleDeviceClass {
  Ipad = 'IPAD',
  Iphone = 'IPHONE',
  Mac = 'MAC',
  Unknown = 'UNKNOWN'
}

export type AppleDeviceFilterInput = {
  appleTeamIdentifier?: InputMaybe<Scalars['String']['input']>;
  class?: InputMaybe<AppleDeviceClass>;
  identifier?: InputMaybe<Scalars['String']['input']>;
};

export type AppleDeviceInput = {
  appleTeamId: Scalars['ID']['input'];
  deviceClass?: InputMaybe<AppleDeviceClass>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  identifier: Scalars['String']['input'];
  model?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  softwareVersion?: InputMaybe<Scalars['String']['input']>;
};

export type AppleDeviceUpdateInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type AppleDistributionCertificateInput = {
  appleTeamId?: InputMaybe<Scalars['ID']['input']>;
  certP12: Scalars['String']['input'];
  certPassword: Scalars['String']['input'];
  certPrivateSigningKey?: InputMaybe<Scalars['String']['input']>;
  developerPortalIdentifier?: InputMaybe<Scalars['String']['input']>;
};

export type AppleProvisioningProfileInput = {
  appleProvisioningProfile: Scalars['String']['input'];
  developerPortalIdentifier?: InputMaybe<Scalars['String']['input']>;
};

export type ApplePushKeyInput = {
  appleTeamId: Scalars['ID']['input'];
  keyIdentifier: Scalars['String']['input'];
  keyP8: Scalars['String']['input'];
};

export type AppleTeamFilterInput = {
  appleTeamIdentifier?: InputMaybe<Scalars['String']['input']>;
};

export type AppleTeamInput = {
  appleTeamIdentifier: Scalars['String']['input'];
  appleTeamName?: InputMaybe<Scalars['String']['input']>;
  appleTeamType?: InputMaybe<AppleTeamType>;
};

export enum AppleTeamType {
  CompanyOrOrganization = 'COMPANY_OR_ORGANIZATION',
  Individual = 'INDIVIDUAL',
  InHouse = 'IN_HOUSE'
}

export type AppleTeamUpdateInput = {
  appleTeamName?: InputMaybe<Scalars['String']['input']>;
  appleTeamType?: InputMaybe<AppleTeamType>;
};

export type AscApiKeyInput = {
  /** Omit for individual (user-scoped) keys, which have no issuer ID. */
  issuerIdentifier?: InputMaybe<Scalars['String']['input']>;
  keyIdentifier: Scalars['String']['input'];
  keyP8: Scalars['String']['input'];
};

export type AssetMapGroup = {
  android?: InputMaybe<AssetMapSourceInput>;
  ios?: InputMaybe<AssetMapSourceInput>;
  web?: InputMaybe<AssetMapSourceInput>;
};

export type AssetMapSourceInput = {
  bucketKey?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<AssetMapSourceType>;
};

export enum AssetMapSourceType {
  Gcs = 'GCS'
}

export enum AssetMetadataStatus {
  DoesNotExist = 'DOES_NOT_EXIST',
  Exists = 'EXISTS'
}

export type AuditLogExportInput = {
  accountId: Scalars['ID']['input'];
  createdAfter: Scalars['String']['input'];
  createdBefore: Scalars['String']['input'];
  format: AuditLogsExportFormat;
  targetEntityMutationType?: InputMaybe<Array<TargetEntityMutationType>>;
  targetEntityTypeName?: InputMaybe<Array<EntityTypeName>>;
};

export type AuditLogFilterInput = {
  entityTypes?: InputMaybe<Array<EntityTypeName>>;
  mutationTypes?: InputMaybe<Array<TargetEntityMutationType>>;
};

export enum AuditLogsExportFormat {
  Csv = 'CSV',
  Json = 'JSON',
  Jsonl = 'JSONL'
}

export enum AuthProtocolType {
  Oidc = 'OIDC'
}

export enum AuthProviderIdentifier {
  AmazonFederate = 'AMAZON_FEDERATE',
  Generic = 'GENERIC',
  GoogleWs = 'GOOGLE_WS',
  MsEntraId = 'MS_ENTRA_ID',
  Okta = 'OKTA',
  OneLogin = 'ONE_LOGIN',
  Rippling = 'RIPPLING',
  StubIdp = 'STUB_IDP'
}

export enum BackgroundJobResultType {
  AuditLogsExport = 'AUDIT_LOGS_EXPORT',
  GithubBuild = 'GITHUB_BUILD',
  UserAuditLogsExport = 'USER_AUDIT_LOGS_EXPORT',
  Void = 'VOID',
  WorkflowsInsightsExport = 'WORKFLOWS_INSIGHTS_EXPORT'
}

export enum BackgroundJobState {
  Failure = 'FAILURE',
  InProgress = 'IN_PROGRESS',
  Queued = 'QUEUED',
  Success = 'SUCCESS'
}

export type BeginSupabaseOAuthInput = {
  accountId: Scalars['ID']['input'];
};

export type BranchFilterInput = {
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};

export type BrownfieldArtifactFilterInput = {
  bundleName?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<AppPlatform>;
  version?: InputMaybe<Scalars['String']['input']>;
};

export type BuildAnnotationDataInput = {
  buildPhase: Scalars['String']['input'];
  exampleBuildLog?: InputMaybe<Scalars['String']['input']>;
  internalNotes?: InputMaybe<Scalars['String']['input']>;
  message: Scalars['String']['input'];
  regexFlags?: InputMaybe<Scalars['String']['input']>;
  regexString: Scalars['String']['input'];
  title: Scalars['String']['input'];
  type: BuildAnnotationType;
};

export type BuildAnnotationFiltersInput = {
  buildPhases: Array<Scalars['String']['input']>;
};

export enum BuildAnnotationType {
  Error = 'ERROR',
  Info = 'INFO',
  Warning = 'WARNING'
}

export type BuildCacheInput = {
  clear?: InputMaybe<Scalars['Boolean']['input']>;
  disabled?: InputMaybe<Scalars['Boolean']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
  paths?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum BuildCredentialsSource {
  Local = 'LOCAL',
  Remote = 'REMOTE'
}

export type BuildFilter = {
  appBuildVersion?: InputMaybe<Scalars['String']['input']>;
  appIdentifier?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  buildProfile?: InputMaybe<Scalars['String']['input']>;
  channel?: InputMaybe<Scalars['String']['input']>;
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  distribution?: InputMaybe<DistributionType>;
  fingerprintHash?: InputMaybe<Scalars['String']['input']>;
  gitCommitHash?: InputMaybe<Scalars['String']['input']>;
  hasFingerprint?: InputMaybe<Scalars['Boolean']['input']>;
  platform?: InputMaybe<AppPlatform>;
  runtimeVersion?: InputMaybe<Scalars['String']['input']>;
  sdkVersion?: InputMaybe<Scalars['String']['input']>;
  simulator?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<BuildStatus>;
};

export type BuildFilterInput = {
  buildModes?: InputMaybe<Array<BuildMode>>;
  buildProfile?: InputMaybe<Scalars['String']['input']>;
  channel?: InputMaybe<Scalars['String']['input']>;
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  distributions?: InputMaybe<Array<DistributionType>>;
  expired?: InputMaybe<Scalars['Boolean']['input']>;
  fingerprintHash?: InputMaybe<Scalars['String']['input']>;
  hasFingerprint?: InputMaybe<Scalars['Boolean']['input']>;
  platforms?: InputMaybe<Array<AppPlatform>>;
  releaseChannel?: InputMaybe<Scalars['String']['input']>;
  runtimeVersion?: InputMaybe<Scalars['String']['input']>;
  simulator?: InputMaybe<Scalars['Boolean']['input']>;
  statuses?: InputMaybe<Array<BuildStatus>>;
};

export enum BuildIosEnterpriseProvisioning {
  Adhoc = 'ADHOC',
  Universal = 'UNIVERSAL'
}

export enum BuildLimitThresholdExceededMetadataType {
  Ios = 'IOS',
  Total = 'TOTAL'
}

export type BuildMetadataInput = {
  appBuildVersion?: InputMaybe<Scalars['String']['input']>;
  appIdentifier?: InputMaybe<Scalars['String']['input']>;
  appName?: InputMaybe<Scalars['String']['input']>;
  appVersion?: InputMaybe<Scalars['String']['input']>;
  buildProfile?: InputMaybe<Scalars['String']['input']>;
  channel?: InputMaybe<Scalars['String']['input']>;
  cliVersion?: InputMaybe<Scalars['String']['input']>;
  credentialsSource?: InputMaybe<BuildCredentialsSource>;
  customNodeVersion?: InputMaybe<Scalars['String']['input']>;
  customWorkflowName?: InputMaybe<Scalars['String']['input']>;
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  distribution?: InputMaybe<DistributionType>;
  environment?: InputMaybe<Scalars['String']['input']>;
  expoPackageVersion?: InputMaybe<Scalars['String']['input']>;
  fingerprintHash?: InputMaybe<Scalars['String']['input']>;
  fingerprintSource?: InputMaybe<FingerprintSourceInput>;
  gitCommitHash?: InputMaybe<Scalars['String']['input']>;
  gitCommitMessage?: InputMaybe<Scalars['String']['input']>;
  iosEnterpriseProvisioning?: InputMaybe<BuildIosEnterpriseProvisioning>;
  isGitWorkingTreeDirty?: InputMaybe<Scalars['Boolean']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  projectMetadataFile?: InputMaybe<ProjectMetadataFileInput>;
  reactNativeVersion?: InputMaybe<Scalars['String']['input']>;
  releaseChannel?: InputMaybe<Scalars['String']['input']>;
  requiredPackageManager?: InputMaybe<Scalars['String']['input']>;
  runFromCI?: InputMaybe<Scalars['Boolean']['input']>;
  runWithNoWaitFlag?: InputMaybe<Scalars['Boolean']['input']>;
  runtimeVersion?: InputMaybe<Scalars['String']['input']>;
  sdkVersion?: InputMaybe<Scalars['String']['input']>;
  simulator?: InputMaybe<Scalars['Boolean']['input']>;
  trackingContext?: InputMaybe<Scalars['JSONObject']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
  workflow?: InputMaybe<BuildWorkflow>;
};

export enum BuildMode {
  Build = 'BUILD',
  Custom = 'CUSTOM',
  Local = 'LOCAL',
  Repack = 'REPACK',
  Resign = 'RESIGN'
}

export type BuildParamsInput = {
  /**
   * The role of the EXPO_TOKEN that the build gets. The caller must have at least this role on the
   * account, or the mutation fails. Without it, the token has the default permissions.
   */
  expoTokenRole?: InputMaybe<JobExpoTokenRole>;
  reactNativeVersion?: InputMaybe<Scalars['String']['input']>;
  resourceClass: BuildResourceClass;
  sdkVersion?: InputMaybe<Scalars['String']['input']>;
};

export enum BuildPhase {
  BuilderInfo = 'BUILDER_INFO',
  CacheStats = 'CACHE_STATS',
  CalculateExpoUpdatesRuntimeVersion = 'CALCULATE_EXPO_UPDATES_RUNTIME_VERSION',
  CleanUpCredentials = 'CLEAN_UP_CREDENTIALS',
  CompleteBuild = 'COMPLETE_BUILD',
  CompleteJob = 'COMPLETE_JOB',
  ConfigureAndroidVersion = 'CONFIGURE_ANDROID_VERSION',
  ConfigureExpoUpdates = 'CONFIGURE_EXPO_UPDATES',
  ConfigureXcodeProject = 'CONFIGURE_XCODE_PROJECT',
  Custom = 'CUSTOM',
  DownloadApplicationArchive = 'DOWNLOAD_APPLICATION_ARCHIVE',
  EagerBundle = 'EAGER_BUNDLE',
  EasBuildInternal = 'EAS_BUILD_INTERNAL',
  FailBuild = 'FAIL_BUILD',
  FixGradlew = 'FIX_GRADLEW',
  GradleBuildProfile = 'GRADLE_BUILD_PROFILE',
  InstallCustomTools = 'INSTALL_CUSTOM_TOOLS',
  InstallDependencies = 'INSTALL_DEPENDENCIES',
  InstallPods = 'INSTALL_PODS',
  OnBuildCancelHook = 'ON_BUILD_CANCEL_HOOK',
  OnBuildCompleteHook = 'ON_BUILD_COMPLETE_HOOK',
  OnBuildErrorHook = 'ON_BUILD_ERROR_HOOK',
  OnBuildSuccessHook = 'ON_BUILD_SUCCESS_HOOK',
  ParseCustomWorkflowConfig = 'PARSE_CUSTOM_WORKFLOW_CONFIG',
  ParseXcactivitylog = 'PARSE_XCACTIVITYLOG',
  PostInstallHook = 'POST_INSTALL_HOOK',
  Prebuild = 'PREBUILD',
  PrepareArtifacts = 'PREPARE_ARTIFACTS',
  PrepareCredentials = 'PREPARE_CREDENTIALS',
  PrepareProject = 'PREPARE_PROJECT',
  PreInstallHook = 'PRE_INSTALL_HOOK',
  PreUploadArtifactsHook = 'PRE_UPLOAD_ARTIFACTS_HOOK',
  Queue = 'QUEUE',
  ReadAppConfig = 'READ_APP_CONFIG',
  ReadEasJson = 'READ_EAS_JSON',
  ReadPackageJson = 'READ_PACKAGE_JSON',
  RestoreCache = 'RESTORE_CACHE',
  RunExpoDoctor = 'RUN_EXPO_DOCTOR',
  RunFastlane = 'RUN_FASTLANE',
  RunGradlew = 'RUN_GRADLEW',
  SaveCache = 'SAVE_CACHE',
  SetUpBuildEnvironment = 'SET_UP_BUILD_ENVIRONMENT',
  SpinUpBuilder = 'SPIN_UP_BUILDER',
  SshSession = 'SSH_SESSION',
  StartBuild = 'START_BUILD',
  Unknown = 'UNKNOWN',
  UploadApplicationArchive = 'UPLOAD_APPLICATION_ARCHIVE',
  /** @deprecated No longer supported */
  UploadArtifacts = 'UPLOAD_ARTIFACTS',
  UploadBuildArtifacts = 'UPLOAD_BUILD_ARTIFACTS',
  UploadEmbeddedBundle = 'UPLOAD_EMBEDDED_BUNDLE'
}

export enum BuildPriority {
  High = 'HIGH',
  Normal = 'NORMAL',
  NormalPlus = 'NORMAL_PLUS'
}

export type BuildResignInput = {
  applicationArchiveSource?: InputMaybe<ProjectArchiveSourceInput>;
};

export enum BuildResourceClass {
  AndroidDefault = 'ANDROID_DEFAULT',
  AndroidLarge = 'ANDROID_LARGE',
  AndroidMedium = 'ANDROID_MEDIUM',
  IosDefault = 'IOS_DEFAULT',
  /** @deprecated No longer available. Use IOS_M_LARGE instead. */
  IosIntelLarge = 'IOS_INTEL_LARGE',
  /** @deprecated No longer available. Use IOS_M_MEDIUM instead. */
  IosIntelMedium = 'IOS_INTEL_MEDIUM',
  IosLarge = 'IOS_LARGE',
  /** @deprecated Use IOS_M_MEDIUM instead */
  IosM1Large = 'IOS_M1_LARGE',
  /** @deprecated Use IOS_M_MEDIUM instead */
  IosM1Medium = 'IOS_M1_MEDIUM',
  IosMedium = 'IOS_MEDIUM',
  IosMLarge = 'IOS_M_LARGE',
  IosMMedium = 'IOS_M_MEDIUM',
  Legacy = 'LEGACY',
  LinuxLarge = 'LINUX_LARGE',
  LinuxMedium = 'LINUX_MEDIUM'
}

export enum BuildRetryDisabledReason {
  AlreadyRetried = 'ALREADY_RETRIED',
  InvalidStatus = 'INVALID_STATUS',
  IsGithubBuild = 'IS_GITHUB_BUILD',
  IsWorkflowBuild = 'IS_WORKFLOW_BUILD',
  LocalBuildsNotRetryable = 'LOCAL_BUILDS_NOT_RETRYABLE',
  NotCompletedYet = 'NOT_COMPLETED_YET',
  TooMuchTimeElapsed = 'TOO_MUCH_TIME_ELAPSED'
}

export enum BuildStatus {
  Canceled = 'CANCELED',
  Errored = 'ERRORED',
  Finished = 'FINISHED',
  InProgress = 'IN_PROGRESS',
  InQueue = 'IN_QUEUE',
  New = 'NEW',
  PendingCancel = 'PENDING_CANCEL'
}

export enum BuildTrigger {
  EasCli = 'EAS_CLI',
  GitBasedIntegration = 'GIT_BASED_INTEGRATION'
}

export type BuildUpdatesInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
};

export enum BuildWorkflow {
  Generic = 'GENERIC',
  Managed = 'MANAGED',
  Unknown = 'UNKNOWN'
}

export type ChannelFilterInput = {
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};

export type CodeSigningInfoInput = {
  alg: Scalars['String']['input'];
  keyid: Scalars['String']['input'];
  sig: Scalars['String']['input'];
};

export type CompleteClaudeConnectionInput = {
  authorizationCode: Scalars['String']['input'];
  requestId: Scalars['ID']['input'];
};

export type CompletePostHogConnectionInput = {
  code: Scalars['String']['input'];
  state: Scalars['ID']['input'];
};

export type CompleteSupabaseOAuthInput = {
  code: Scalars['String']['input'];
  state: Scalars['ID']['input'];
};

export enum ContinentCode {
  Af = 'AF',
  An = 'AN',
  As = 'AS',
  Eu = 'EU',
  Na = 'NA',
  Oc = 'OC',
  Sa = 'SA',
  T1 = 'T1'
}

export enum CrashSampleFor {
  Newest = 'NEWEST',
  Oldest = 'OLDEST'
}

export type CrashesFilters = {
  crashKind?: InputMaybe<Array<WorkerDeploymentCrashKind>>;
  name?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateAccessTokenInput = {
  actorID: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  /**
   * When given, requests authenticated with the new token are restricted to these scopes instead
   * of the actor's full access. Either a single ALL_ACCOUNTS scope or one ACCOUNT scope per
   * account.
   */
  scopes?: InputMaybe<Array<AccessTokenScopeInput>>;
};

export type CreateAndConfigureRepositoryInput = {
  appId: Scalars['ID']['input'];
  installationIdentifier: Scalars['Int']['input'];
};

export type CreateAndroidDeviceRunSessionInput = {
  /** AVD hardware profile id to use for the emulator (e.g. "pixel_9"). Defaults to "medium_phone". */
  deviceIdentifier?: InputMaybe<Scalars['String']['input']>;
  /**
   * Logs to record during the session and upload afterward: emulator-output and device-logcat. Defaults to
   * ["emulator-output"]. An empty list disables recording and uploading both sources. Device-wide logcat can contain
   * credentials and personal data; include device-logcat only when you want to retain it.
   * Logs are not redacted and follow the artifact retention policy.
   */
  logSources?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * Android SDK system image package to use for the emulator (e.g.
   * "system-images;android-35;google_apis;x86_64").
   */
  systemImagePackage?: InputMaybe<Scalars['String']['input']>;
};

export type CreateAndroidSubmissionInput = {
  appId: Scalars['ID']['input'];
  archiveSource?: InputMaybe<SubmissionArchiveSourceInput>;
  config: AndroidSubmissionConfigInput;
  submittedBuildId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateBrownfieldArtifactInput = {
  appId: Scalars['ID']['input'];
  bundleName: Scalars['String']['input'];
  /** Filename for the artifact (e.g. "MyFramework.xcframework.tar.gz"). */
  filename: Scalars['String']['input'];
  platform: AppPlatform;
  /** The ID of the turtle job run that is producing this artifact. */
  producingTurtleJobRunId: Scalars['ID']['input'];
  /** Size of the artifact in bytes. Required for generating the signed upload URL. */
  size: Scalars['Int']['input'];
  /** Optional. If omitted, the version is auto-incremented from the latest artifact for the same platform and bundle name. */
  version?: InputMaybe<Scalars['String']['input']>;
};

export type CreateConvexTeamConnectionInput = {
  accountId: Scalars['ID']['input'];
  convexTeamName?: InputMaybe<Scalars['String']['input']>;
  deploymentRegion: Scalars['String']['input'];
};

export type CreateDeviceRunSessionInput = {
  /**
   * The coding agent sending this request, recorded for analytics only and never used for
   * authorization. Surrounding whitespace is trimmed, and a blank value or one over 200 characters
   * is treated as omitted.
   */
  agentId?: InputMaybe<Scalars['String']['input']>;
  /**
   * The coding agent's own session identifier, recorded for analytics only and never used for
   * authorization. Surrounding whitespace is trimmed, and a blank value or one over 200 characters
   * is treated as omitted.
   */
  agentSessionId?: InputMaybe<Scalars['String']['input']>;
  /** Android emulator options. Only supported when platform is ANDROID. */
  android?: InputMaybe<CreateAndroidDeviceRunSessionInput>;
  appId: Scalars['ID']['input'];
  /**
   * Application archive URL to download, install, and launch before the simulator session
   * becomes available. Mutually exclusive with buildId, buildFingerprint, and expoGo.
   */
  applicationArchiveUrl?: InputMaybe<Scalars['String']['input']>;
  /**
   * Fingerprint hash of an EAS Build to install and launch before the simulator session becomes
   * available; the server resolves it to the most recent installable build with this fingerprint.
   * Mutually exclusive with buildId, applicationArchiveUrl, and expoGo.
   */
  buildFingerprint?: InputMaybe<Scalars['String']['input']>;
  /**
   * EAS Build to install and launch before the simulator session becomes available.
   * Mutually exclusive with buildFingerprint, applicationArchiveUrl, and expoGo.
   */
  buildId?: InputMaybe<Scalars['ID']['input']>;
  /**
   * Origins of pages that may call the session's preview host API cross-origin, for example to
   * render the device with @expo/hub-client. Framing the preview does not need this. Same value
   * rules as frameAncestors. At most 10. The page still needs the preview token from remoteConfig.
   * If omitted, only expo.dev may call the preview API cross-origin. Available on Production and
   * Enterprise plans.
   */
  corsOrigins?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * Where the virtual device's proxied network traffic exits to the internet. If
   * omitted, all traffic exits from EAS infrastructure.
   */
  egress?: InputMaybe<DeviceRunSessionEgress>;
  /**
   * Install and launch Expo Go before the simulator session becomes available. The server resolves
   * the platform-specific application archive. Mutually exclusive with buildId, buildFingerprint,
   * and applicationArchiveUrl.
   */
  expoGo?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * Origins of pages that may embed the session's preview host in a frame, next to expo.dev.
   * Each value is an https origin such as https://app.example.com or a subdomain wildcard such
   * as https://*.example.com; plain http is accepted for localhost only. At most 10. The
   * embedding page still needs the preview token from remoteConfig, and whoever embeds the
   * preview can also control the device. If omitted, only expo.dev may embed the preview.
   * Available on Production and Enterprise plans.
   */
  frameAncestors?: InputMaybe<Array<Scalars['String']['input']>>;
  /** iOS Simulator options. Only supported when platform is IOS. */
  ios?: InputMaybe<CreateIosDeviceRunSessionInput>;
  /**
   * Arguments passed to the installed application when it is launched. Requires buildId,
   * applicationArchiveUrl, or expoGo.
   */
  launchArgs?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * Stop the session automatically after this many minutes without observed
   * session activity. Must be positive and no greater than the session's maximum
   * duration (maxRunTimeMinutes when set). Only supported for
   * agent-device, argent, and Appium sessions. If omitted, the session has no idle
   * timeout.
   */
  maxIdleTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  /**
   * Maximum usable session duration, in minutes, starting when the remote session
   * is ready. Must be non-negative and no greater than 40 for normal-priority
   * accounts or 115 for high-priority accounts. The backing job receives an
   * additional five minutes for cleanup.
   */
  maxRunTimeMinutes?: InputMaybe<Scalars['Int']['input']>;
  /**
   * Human-readable label for the session, at most 255 characters after leading and
   * trailing whitespace is trimmed. If omitted, the session is unnamed and clients
   * fall back to identifying it by id.
   */
  name?: InputMaybe<Scalars['String']['input']>;
  /**
   * Record HTTP(S) traffic from apps on the device for the whole session. iOS only.
   * HTTPS is decrypted, so recordings contain credentials and cookies in cleartext.
   * If omitted, no traffic is recorded.
   */
  networkCapture?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * What network capture may keep beyond method, URL, status, timing and size: header, query,
   * request-body, response-body. Each can carry credentials, so nothing here is recorded unless
   * it is asked for. Requires networkCapture.
   */
  networkCaptureFields?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * Expo or development-client URL to open after launching the installed application. Requires
   * buildId, applicationArchiveUrl, or expoGo.
   */
  openUrl?: InputMaybe<Scalars['String']['input']>;
  /**
   * The version of the package backing the device run session (e.g. "0.1.3-alpha.3").
   * If omitted, consumers treat the session as pinned to "latest".
   */
  packageVersion?: InputMaybe<Scalars['String']['input']>;
  platform: AppPlatform;
  /**
   * Prefer public preview links and show the preview host's Share button. Defaults to false.
   * This is a presentation preference and does not change access to bearer links.
   */
  publicPreview?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * The client sending this request, recorded for analytics only. Omit it when the
   * client is not one of the listed values; the session is then reported as unknown.
   */
  requestOrigin?: InputMaybe<DeviceRunSessionRequestOrigin>;
  resourceClass?: InputMaybe<DeviceRunSessionResourceClass>;
  /**
   * Expo SDK version used to select an Expo Go application archive. Only supported when expoGo is
   * true. If omitted, the current Expo Go archive for the platform is used.
   */
  sdkVersion?: InputMaybe<Scalars['String']['input']>;
  /** Free-form labels for grouping sessions, for example one per app variant. */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type: DeviceRunSessionType;
};

export type CreateEnvironmentSecretInput = {
  name: Scalars['String']['input'];
  type?: InputMaybe<EnvironmentSecretType>;
  value: Scalars['String']['input'];
};

export type CreateEnvironmentVariableInput = {
  environments?: InputMaybe<Array<Scalars['EnvironmentVariableEnvironment']['input']>>;
  fileName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  overwrite?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EnvironmentSecretType>;
  value: Scalars['String']['input'];
  visibility: EnvironmentVariableVisibility;
};

export type CreateFingerprintInput = {
  hash: Scalars['String']['input'];
  source?: InputMaybe<FingerprintSourceInput>;
};

export type CreateGitHubAppInstallationInput = {
  accountId: Scalars['ID']['input'];
  githubAppRegistrationId?: InputMaybe<Scalars['ID']['input']>;
  installationIdentifier: Scalars['Int']['input'];
};

export type CreateGitHubBuildTriggerInput = {
  appId: Scalars['ID']['input'];
  autoSubmit: Scalars['Boolean']['input'];
  buildProfile: Scalars['String']['input'];
  environment?: InputMaybe<Scalars['EnvironmentVariableEnvironment']['input']>;
  executionBehavior: GitHubBuildTriggerExecutionBehavior;
  isActive: Scalars['Boolean']['input'];
  platform: AppPlatform;
  /** A branch or tag name, or a wildcard pattern where the code change originates from. For example, `main` or `release/*`. */
  sourcePattern: Scalars['String']['input'];
  submitProfile?: InputMaybe<Scalars['String']['input']>;
  /** A branch name or a wildcard pattern that the pull request targets. For example, `main` or `release/*`. */
  targetPattern?: InputMaybe<Scalars['String']['input']>;
  type: GitHubBuildTriggerType;
};

export type CreateGitHubJobRunTriggerInput = {
  appId: Scalars['ID']['input'];
  isActive: Scalars['Boolean']['input'];
  jobType: GitHubJobRunJobType;
  sourcePattern: Scalars['String']['input'];
  targetPattern?: InputMaybe<Scalars['String']['input']>;
  triggerType: GitHubJobRunTriggerType;
};

export type CreateGitHubRepositoryInput = {
  appId: Scalars['ID']['input'];
  githubAppInstallationId: Scalars['ID']['input'];
  githubRepositoryIdentifier: Scalars['Int']['input'];
  nodeIdentifier: Scalars['String']['input'];
};

export type CreateGitHubRepositorySettingsInput = {
  appId: Scalars['ID']['input'];
  /** The base directory is the directory to change to before starting a build. This string should be a properly formatted POSIX path starting with '/', './', or the name of the directory relative to the root of the repository. Valid examples include: '/apps/expo-app', './apps/expo-app', and 'apps/expo-app'. This is intended for monorepos or apps that live in a subdirectory of a repository. */
  baseDirectory: Scalars['String']['input'];
};

export type CreateIosDeviceRunSessionInput = {
  /**
   * Simulator device name or UDID to use for the session (e.g. "iPhone 17 Pro"). Defaults to
   * "iPhone 17".
   */
  deviceIdentifier?: InputMaybe<Scalars['String']['input']>;
};

export type CreateIosSubmissionInput = {
  appId: Scalars['ID']['input'];
  archiveSource?: InputMaybe<SubmissionArchiveSourceInput>;
  config: IosSubmissionConfigInput;
  submittedBuildId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreatePostHogAccountRequestInput = {
  accountId: Scalars['ID']['input'];
  region: PostHogRegion;
};

export type CreatePostHogDeepLinkInput = {
  /** When set, deep-links to this app's linked PostHog project; otherwise lands on the organization home. */
  appId?: InputMaybe<Scalars['ID']['input']>;
  posthogOrganizationConnectionId: Scalars['ID']['input'];
  /** Which EAS surface opened the link; omitted lets PostHog apply its own default. */
  purpose?: InputMaybe<PostHogDeepLinkPurpose>;
};

export type CreateSandboxInput = {
  agentRunId?: InputMaybe<Scalars['ID']['input']>;
  appId: Scalars['ID']['input'];
  image?: InputMaybe<Scalars['String']['input']>;
  maxDurationSeconds?: InputMaybe<Scalars['Int']['input']>;
  operatingSystem: SandboxOperatingSystem;
  projectArchive?: InputMaybe<SandboxProjectArchiveInput>;
  resourceClass: SandboxResourceClass;
};

export type CreateSentryProjectInput = {
  appId: Scalars['ID']['input'];
  sentryProjectId: Scalars['String']['input'];
  sentryProjectSlug: Scalars['String']['input'];
};

export type CreateSharedEnvironmentVariableInput = {
  environments?: InputMaybe<Array<Scalars['EnvironmentVariableEnvironment']['input']>>;
  fileName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  overwrite?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EnvironmentSecretType>;
  value: Scalars['String']['input'];
  visibility: EnvironmentVariableVisibility;
};

export type CreateVexoAccountConnectionInput = {
  accountId: Scalars['ID']['input'];
  code: Scalars['String']['input'];
};

export type CreateVexoAppInput = {
  appId: Scalars['ID']['input'];
  domain?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  owner: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  vexoIdentifier: Scalars['String']['input'];
};

export type CreateWorkflowDeviceTestCaseResultsInput = {
  /** Test case results to create. (path, retryCount) pairs must be unique. */
  testCaseResults: Array<WorkflowDeviceTestCaseResultInput>;
  /** ID of the workflow job to associate results with. */
  workflowJobId: Scalars['ID']['input'];
};

export type CustomBuildConfigInput = {
  path: Scalars['String']['input'];
};

export enum CustomDomainDnsRecordType {
  A = 'A',
  Cname = 'CNAME',
  Txt = 'TXT'
}

export enum CustomDomainStatus {
  Active = 'ACTIVE',
  Error = 'ERROR',
  Pending = 'PENDING',
  TimedOut = 'TIMED_OUT'
}

export enum DashboardViewPin {
  Activity = 'ACTIVITY',
  Overview = 'OVERVIEW'
}

export type DatasetTimespan = {
  end: Scalars['DateTime']['input'];
  start: Scalars['DateTime']['input'];
};

export type DeploymentBuildFilterInput = {
  status?: InputMaybe<BuildStatus>;
};

export type DeploymentFilterInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
  runtimeVersion?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Where the virtual device's proxied network traffic exits to the internet. When
 * unset, all traffic exits from EAS infrastructure.
 */
export enum DeviceRunSessionEgress {
  /**
   * HTTP(S) requests that honor the device's system proxy exit through a reverse
   * tunnel to the machine running the EAS CLI egress client, so third parties see
   * that machine's public IP. Those requests fail while the client is disconnected.
   * Requests from libraries that bypass the system proxy are not covered and exit
   * from EAS infrastructure. The client must stay connected for the life of the
   * session.
   */
  Local = 'LOCAL'
}

export type DeviceRunSessionFilterInput = {
  /** Case-insensitive match anywhere in the session name. */
  name?: InputMaybe<Scalars['String']['input']>;
  platforms?: InputMaybe<Array<AppPlatform>>;
  statuses?: InputMaybe<Array<DeviceRunSessionStatus>>;
  /** Matches sessions carrying every listed tag. Case-insensitive. */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  types?: InputMaybe<Array<DeviceRunSessionType>>;
};

/**
 * The client that sent a session creation request, as reported by that client. Recorded
 * for analytics only and never used for authorization.
 */
export enum DeviceRunSessionRequestOrigin {
  EasCli = 'EAS_CLI',
  Mcp = 'MCP',
  Website = 'WEBSITE'
}

export enum DeviceRunSessionResourceClass {
  Large = 'LARGE',
  Medium = 'MEDIUM'
}

export enum DeviceRunSessionStatus {
  Errored = 'ERRORED',
  InProgress = 'IN_PROGRESS',
  New = 'NEW',
  /** The session's job run waits in the queue for a worker. */
  Queued = 'QUEUED',
  /** A worker runs the session's job and prepares the virtual device. */
  Starting = 'STARTING',
  Stopped = 'STOPPED'
}

export enum DeviceRunSessionType {
  AgentDevice = 'AGENT_DEVICE',
  Appium = 'APPIUM',
  Argent = 'ARGENT',
  /** @deprecated Use WEB_PREVIEW_ONLY instead. */
  ServeSim = 'SERVE_SIM',
  /** A session accessed only through its web preview. */
  WebPreviewOnly = 'WEB_PREVIEW_ONLY'
}

export enum DistributionType {
  Internal = 'INTERNAL',
  Simulator = 'SIMULATOR',
  Store = 'STORE'
}

export enum EasBuildBillingResourceClass {
  Large = 'LARGE',
  Medium = 'MEDIUM'
}

export enum EasBuildDeprecationInfoType {
  Internal = 'INTERNAL',
  UserFacing = 'USER_FACING'
}

export enum EasBuildWaiverType {
  FastFailedBuild = 'FAST_FAILED_BUILD',
  SystemError = 'SYSTEM_ERROR'
}

export enum EasService {
  Builds = 'BUILDS',
  Jobs = 'JOBS',
  Mcp = 'MCP',
  Observe = 'OBSERVE',
  Simulator = 'SIMULATOR',
  Updates = 'UPDATES'
}

export enum EasServiceMetric {
  AssetsRequests = 'ASSETS_REQUESTS',
  BandwidthUsage = 'BANDWIDTH_USAGE',
  Builds = 'BUILDS',
  LocalBuilds = 'LOCAL_BUILDS',
  ManifestRequests = 'MANIFEST_REQUESTS',
  McpRequests = 'MCP_REQUESTS',
  ObserveEvents = 'OBSERVE_EVENTS',
  RunTime = 'RUN_TIME',
  SimulatorUsage = 'SIMULATOR_USAGE',
  UniqueUpdaters = 'UNIQUE_UPDATERS',
  UniqueUsers = 'UNIQUE_USERS'
}

export enum EasTotalPlanEnablementUnit {
  Build = 'BUILD',
  Byte = 'BYTE',
  Concurrency = 'CONCURRENCY',
  Event = 'EVENT',
  Minute = 'MINUTE',
  Request = 'REQUEST',
  Updater = 'UPDATER',
  User = 'USER'
}

export type EditUpdateBranchInput = {
  appId?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  newName: Scalars['String']['input'];
};

export type EmbeddedUpdateFilterInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<AppPlatform>;
  runtimeVersion?: InputMaybe<Scalars['String']['input']>;
};

export enum EntityTypeName {
  AccountEntity = 'AccountEntity',
  AccountSsoConfigurationEntity = 'AccountSSOConfigurationEntity',
  AgentProviderConnectionEntity = 'AgentProviderConnectionEntity',
  AndroidAppCredentialsEntity = 'AndroidAppCredentialsEntity',
  AndroidKeystoreEntity = 'AndroidKeystoreEntity',
  AppEntity = 'AppEntity',
  AppStoreConnectApiKeyEntity = 'AppStoreConnectApiKeyEntity',
  AppStoreConnectAppEntity = 'AppStoreConnectAppEntity',
  AppleDeviceEntity = 'AppleDeviceEntity',
  AppleDistributionCertificateEntity = 'AppleDistributionCertificateEntity',
  AppleProvisioningProfileEntity = 'AppleProvisioningProfileEntity',
  AppleTeamEntity = 'AppleTeamEntity',
  BillingContractEntity = 'BillingContractEntity',
  BranchEntity = 'BranchEntity',
  ChannelEntity = 'ChannelEntity',
  ConvexProjectEntity = 'ConvexProjectEntity',
  ConvexTeamConnectionEntity = 'ConvexTeamConnectionEntity',
  CustomerEntity = 'CustomerEntity',
  /** @deprecated This entity type was deleted. Existing audit logs can still reference it. */
  EchoProjectEntity = 'EchoProjectEntity',
  /** @deprecated This entity type was deleted. Existing audit logs can still reference it. */
  EchoVersionEntity = 'EchoVersionEntity',
  EnvironmentVariableEntity = 'EnvironmentVariableEntity',
  GoogleServiceAccountKeyEntity = 'GoogleServiceAccountKeyEntity',
  IosAppCredentialsEntity = 'IosAppCredentialsEntity',
  LogRocketOrganizationEntity = 'LogRocketOrganizationEntity',
  LogRocketProjectEntity = 'LogRocketProjectEntity',
  PostHogOrganizationConnectionEntity = 'PostHogOrganizationConnectionEntity',
  PostHogProjectEntity = 'PostHogProjectEntity',
  SupabaseConnectionEntity = 'SupabaseConnectionEntity',
  SupabaseProjectEntity = 'SupabaseProjectEntity',
  UserInvitationEntity = 'UserInvitationEntity',
  UserPermissionEntity = 'UserPermissionEntity',
  VexoAccountConnectionEntity = 'VexoAccountConnectionEntity',
  VexoAppEntity = 'VexoAppEntity',
  WorkerCustomDomainEntity = 'WorkerCustomDomainEntity',
  WorkerDeploymentAliasEntity = 'WorkerDeploymentAliasEntity',
  WorkerEntity = 'WorkerEntity',
  WorkflowEntity = 'WorkflowEntity',
  WorkflowRevisionEntity = 'WorkflowRevisionEntity',
  WorkflowScheduleEntity = 'WorkflowScheduleEntity'
}

export enum EnvironmentSecretType {
  FileBase64 = 'FILE_BASE64',
  String = 'STRING'
}

export enum EnvironmentVariableScope {
  Project = 'PROJECT',
  Shared = 'SHARED'
}

export enum EnvironmentVariableVisibility {
  Public = 'PUBLIC',
  Secret = 'SECRET',
  Sensitive = 'SENSITIVE'
}

export type ExitInterviewBeginChatTurnInput = {
  accountId: Scalars['ID']['input'];
};

export type ExitInterviewCompleteInput = {
  accountId: Scalars['ID']['input'];
  conversationId: Scalars['ID']['input'];
  messages: Array<ExitInterviewMessageInput>;
  outcome: ExitInterviewOutcome;
  /**
   * Optional classification tags. Present when the website's tagging call
   * succeeded; omitted when it failed or when the user dismissed without
   * engaging. When present, drives the conversation-tagged event and the
   * tagged Slack notification.
   */
  tags?: InputMaybe<ExitInterviewTagsInput>;
};

export type ExitInterviewFeedbackInput = {
  accountId: Scalars['ID']['input'];
  conversationId: Scalars['ID']['input'];
  feedback: Scalars['String']['input'];
  outcome: ExitInterviewOutcome;
};

export type ExitInterviewMessageInput = {
  content: Scalars['String']['input'];
  role: ExitInterviewMessageRole;
};

export enum ExitInterviewMessageRole {
  Assistant = 'ASSISTANT',
  User = 'USER'
}

export enum ExitInterviewOutcome {
  CancelledImmediately = 'CANCELLED_IMMEDIATELY',
  ContinuedToStripe = 'CONTINUED_TO_STRIPE',
  Dismissed = 'DISMISSED',
  KeptPlan = 'KEPT_PLAN'
}

/**
 * Tags produced by the website's churn-classification step. The website runs
 * this synchronously before calling complete, then forwards the structured
 * result. Allowed category / sentiment values are enforced by the resolver.
 */
export type ExitInterviewTagsInput = {
  actionableInsight: Scalars['Boolean']['input'];
  category: Scalars['String']['input'];
  competitorMention?: InputMaybe<Scalars['String']['input']>;
  confidence?: InputMaybe<Scalars['String']['input']>;
  productArea?: InputMaybe<Scalars['String']['input']>;
  sentiment: Scalars['String']['input'];
  summary?: InputMaybe<Scalars['String']['input']>;
};

export enum Experiment {
  Orbit = 'ORBIT'
}

export type ExpoGoRepackInput = {
  appId: Scalars['ID']['input'];
  appName?: InputMaybe<Scalars['String']['input']>;
  ascAppId: Scalars['String']['input'];
  bundleId: Scalars['String']['input'];
  sdkVersion?: InputMaybe<Scalars['String']['input']>;
};

export enum Feature {
  /** Priority Builds */
  Builds = 'BUILDS',
  /** Funds support for open source development */
  OpenSource = 'OPEN_SOURCE',
  /** Top Tier Support */
  Support = 'SUPPORT',
  /** Share access to projects */
  Teams = 'TEAMS'
}

export type FinalizeGitHubAppRegistrationInput = {
  code: Scalars['String']['input'];
  state: Scalars['String']['input'];
};

export type FingerprintBuildsFilterInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  distributions?: InputMaybe<Array<DistributionType>>;
  platforms?: InputMaybe<Array<AppPlatform>>;
  releaseChannel?: InputMaybe<Scalars['String']['input']>;
  simulator?: InputMaybe<Scalars['Boolean']['input']>;
};

export type FingerprintFilterInput = {
  hashes?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type FingerprintInfo = {
  fingerprintHash: Scalars['String']['input'];
  fingerprintSource: FingerprintSourceInput;
};

export type FingerprintInfoGroup = {
  android?: InputMaybe<FingerprintInfo>;
  ios?: InputMaybe<FingerprintInfo>;
  web?: InputMaybe<FingerprintInfo>;
};

export type FingerprintSourceInput = {
  bucketKey?: InputMaybe<Scalars['String']['input']>;
  isDebugFingerprint?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<FingerprintSourceType>;
};

export enum FingerprintSourceType {
  Gcs = 'GCS'
}

export type GenerateLogRocketOrganizationLinkingUrlInput = {
  accountId: Scalars['ID']['input'];
  callbackUrl: Scalars['String']['input'];
};

export enum GitHubAppEnvironment {
  Development = 'DEVELOPMENT',
  Production = 'PRODUCTION',
  Staging = 'STAGING'
}

export enum GitHubAppInstallationAccountType {
  Organization = 'ORGANIZATION',
  User = 'USER'
}

export enum GitHubAppInstallationStatus {
  Active = 'ACTIVE',
  NotInstalled = 'NOT_INSTALLED',
  Suspended = 'SUSPENDED'
}

export type GitHubBuildInput = {
  appId: Scalars['ID']['input'];
  autoSubmit?: InputMaybe<Scalars['Boolean']['input']>;
  baseDirectory?: InputMaybe<Scalars['String']['input']>;
  buildProfile: Scalars['String']['input'];
  environment?: InputMaybe<Scalars['EnvironmentVariableEnvironment']['input']>;
  gitRef: Scalars['String']['input'];
  platform: AppPlatform;
  /** Refresh the ad hoc provisioning profile before building. Supported for iOS builds with a build profile that uses internal distribution and remote credentials. */
  refreshAdHocProvisioningProfile?: InputMaybe<Scalars['Boolean']['input']>;
  submitProfile?: InputMaybe<Scalars['String']['input']>;
};

export enum GitHubBuildTriggerExecutionBehavior {
  Always = 'ALWAYS',
  BaseDirectoryChanged = 'BASE_DIRECTORY_CHANGED'
}

export enum GitHubBuildTriggerRunStatus {
  Errored = 'ERRORED',
  Success = 'SUCCESS'
}

export enum GitHubBuildTriggerType {
  PullRequestUpdated = 'PULL_REQUEST_UPDATED',
  PushToBranch = 'PUSH_TO_BRANCH',
  TagUpdated = 'TAG_UPDATED'
}

export enum GitHubJobRunJobType {
  PublishUpdate = 'PUBLISH_UPDATE'
}

export enum GitHubJobRunTriggerRunStatus {
  Errored = 'ERRORED',
  Success = 'SUCCESS'
}

export enum GitHubJobRunTriggerType {
  PullRequestUpdated = 'PULL_REQUEST_UPDATED',
  PushToBranch = 'PUSH_TO_BRANCH'
}

export type GoogleServiceAccountKeyInput = {
  jsonKey: Scalars['JSONObject']['input'];
};

/**
 * The value field is always sent from the client as a string,
 * and then it's parsed server-side according to the filterType
 */
export type InsightsFilter = {
  filterType: InsightsFilterType;
  value: Scalars['String']['input'];
};

export enum InsightsFilterType {
  Platform = 'PLATFORM'
}

export type InsightsTimespan = {
  end: Scalars['DateTime']['input'];
  start: Scalars['DateTime']['input'];
};

export enum InvoiceDiscountType {
  Amount = 'AMOUNT',
  Percentage = 'PERCENTAGE'
}

export type IosAppBuildCredentialsFilter = {
  iosDistributionType?: InputMaybe<IosDistributionType>;
};

export type IosAppBuildCredentialsInput = {
  distributionCertificateId: Scalars['ID']['input'];
  iosDistributionType: IosDistributionType;
  provisioningProfileId: Scalars['ID']['input'];
};

export type IosAppCredentialsFilter = {
  appleAppIdentifierId?: InputMaybe<Scalars['String']['input']>;
};

export type IosAppCredentialsInput = {
  appStoreConnectApiKeyForBuildsId?: InputMaybe<Scalars['ID']['input']>;
  appStoreConnectApiKeyForSubmissionsId?: InputMaybe<Scalars['ID']['input']>;
  appleTeamId?: InputMaybe<Scalars['ID']['input']>;
  pushKeyId?: InputMaybe<Scalars['ID']['input']>;
};

/** @deprecated Use developmentClient option instead. */
export enum IosBuildType {
  DevelopmentClient = 'DEVELOPMENT_CLIENT',
  Release = 'RELEASE'
}

export type IosBuilderEnvironmentInput = {
  bun?: InputMaybe<Scalars['String']['input']>;
  bundler?: InputMaybe<Scalars['String']['input']>;
  cocoapods?: InputMaybe<Scalars['String']['input']>;
  corepack?: InputMaybe<Scalars['Boolean']['input']>;
  env?: InputMaybe<Scalars['JSONObject']['input']>;
  expoCli?: InputMaybe<Scalars['String']['input']>;
  fastlane?: InputMaybe<Scalars['String']['input']>;
  image?: InputMaybe<Scalars['String']['input']>;
  node?: InputMaybe<Scalars['String']['input']>;
  pnpm?: InputMaybe<Scalars['String']['input']>;
  yarn?: InputMaybe<Scalars['String']['input']>;
};

export enum IosDistributionType {
  AdHoc = 'AD_HOC',
  AppStore = 'APP_STORE',
  Development = 'DEVELOPMENT',
  Enterprise = 'ENTERPRISE'
}

export type IosJobDistributionCertificateInput = {
  dataBase64: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type IosJobInput = {
  applicationArchivePath?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated */
  artifactPath?: InputMaybe<Scalars['String']['input']>;
  buildArtifactPaths?: InputMaybe<Array<Scalars['String']['input']>>;
  buildConfiguration?: InputMaybe<Scalars['String']['input']>;
  buildProfile?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated */
  buildType?: InputMaybe<IosBuildType>;
  builderEnvironment?: InputMaybe<IosBuilderEnvironmentInput>;
  cache?: InputMaybe<BuildCacheInput>;
  customBuildConfig?: InputMaybe<CustomBuildConfigInput>;
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  /** @deprecated */
  distribution?: InputMaybe<DistributionType>;
  environment?: InputMaybe<Scalars['EnvironmentVariableEnvironment']['input']>;
  experimental?: InputMaybe<Scalars['JSONObject']['input']>;
  loggerLevel?: InputMaybe<WorkerLoggerLevel>;
  mode?: InputMaybe<BuildMode>;
  projectArchive: ProjectArchiveSourceInput;
  projectRootDirectory: Scalars['String']['input'];
  releaseChannel?: InputMaybe<Scalars['String']['input']>;
  scheme?: InputMaybe<Scalars['String']['input']>;
  secrets?: InputMaybe<IosJobSecretsInput>;
  simulator?: InputMaybe<Scalars['Boolean']['input']>;
  triggeredBy?: InputMaybe<BuildTrigger>;
  type: BuildWorkflow;
  updates?: InputMaybe<BuildUpdatesInput>;
  username?: InputMaybe<Scalars['String']['input']>;
  version?: InputMaybe<IosJobVersionInput>;
};

export type IosJobOverridesInput = {
  applicationArchivePath?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated */
  artifactPath?: InputMaybe<Scalars['String']['input']>;
  buildArtifactPaths?: InputMaybe<Array<Scalars['String']['input']>>;
  buildConfiguration?: InputMaybe<Scalars['String']['input']>;
  buildProfile?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated */
  buildType?: InputMaybe<IosBuildType>;
  builderEnvironment?: InputMaybe<IosBuilderEnvironmentInput>;
  cache?: InputMaybe<BuildCacheInput>;
  customBuildConfig?: InputMaybe<CustomBuildConfigInput>;
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  /** @deprecated */
  distribution?: InputMaybe<DistributionType>;
  experimental?: InputMaybe<Scalars['JSONObject']['input']>;
  loggerLevel?: InputMaybe<WorkerLoggerLevel>;
  mode?: InputMaybe<BuildMode>;
  releaseChannel?: InputMaybe<Scalars['String']['input']>;
  resign?: InputMaybe<BuildResignInput>;
  scheme?: InputMaybe<Scalars['String']['input']>;
  secrets?: InputMaybe<IosJobSecretsInput>;
  simulator?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<BuildWorkflow>;
  updates?: InputMaybe<BuildUpdatesInput>;
  username?: InputMaybe<Scalars['String']['input']>;
  version?: InputMaybe<IosJobVersionInput>;
};

export type IosJobSecretsInput = {
  buildCredentials?: InputMaybe<Array<InputMaybe<IosJobTargetCredentialsInput>>>;
};

export type IosJobTargetCredentialsInput = {
  distributionCertificate: IosJobDistributionCertificateInput;
  provisioningProfileBase64: Scalars['String']['input'];
  targetName: Scalars['String']['input'];
};

export type IosJobVersionInput = {
  buildNumber: Scalars['String']['input'];
};

/** @deprecated Use developmentClient option instead. */
export enum IosManagedBuildType {
  DevelopmentClient = 'DEVELOPMENT_CLIENT',
  Release = 'RELEASE'
}

export enum IosSchemeBuildConfiguration {
  Debug = 'DEBUG',
  Release = 'RELEASE'
}

export type IosSubmissionConfigInput = {
  appleAppSpecificPassword?: InputMaybe<Scalars['String']['input']>;
  appleIdUsername?: InputMaybe<Scalars['String']['input']>;
  ascApiKey?: InputMaybe<AscApiKeyInput>;
  ascApiKeyId?: InputMaybe<Scalars['String']['input']>;
  ascAppIdentifier: Scalars['String']['input'];
  changelog?: InputMaybe<Scalars['String']['input']>;
  groups?: InputMaybe<Array<Scalars['String']['input']>>;
  isVerboseFastlaneEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A role that a build can request for its EXPO_TOKEN. */
export enum JobExpoTokenRole {
  Developer = 'DEVELOPER',
  ReleaseManager = 'RELEASE_MANAGER',
  Runner = 'RUNNER'
}

export enum JobRunPriority {
  High = 'HIGH',
  Normal = 'NORMAL'
}

export enum JobRunStatus {
  Canceled = 'CANCELED',
  Errored = 'ERRORED',
  Finished = 'FINISHED',
  InProgress = 'IN_PROGRESS',
  InQueue = 'IN_QUEUE',
  New = 'NEW',
  PendingCancel = 'PENDING_CANCEL'
}

export type LinkLogRocketOrganizationToExpoAccountInput = {
  accountId: Scalars['ID']['input'];
  client_id: Scalars['String']['input'];
  client_secret: Scalars['String']['input'];
  orgName: Scalars['String']['input'];
  orgSlug: Scalars['String']['input'];
  state: Scalars['String']['input'];
};

export type LinkSentryInstallationToExpoAccountInput = {
  accountId: Scalars['ID']['input'];
  code: Scalars['String']['input'];
  installationId: Scalars['ID']['input'];
  sentryOrgSlug: Scalars['String']['input'];
};

export type LinkSupabaseProjectInput = {
  appId: Scalars['ID']['input'];
  supabaseProjectRef: Scalars['String']['input'];
};

export type LocalBuildArchiveSourceInput = {
  bucketKey: Scalars['String']['input'];
  type: LocalBuildArchiveSourceType;
};

export enum LocalBuildArchiveSourceType {
  Gcs = 'GCS'
}

export type LocalBuildJobInput = {
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  platform: AppPlatform;
  simulator?: InputMaybe<Scalars['Boolean']['input']>;
};

export type LogsTimespan = {
  end: Scalars['DateTime']['input'];
  start?: InputMaybe<Scalars['DateTime']['input']>;
};

export enum NotificationEvent {
  BuildComplete = 'BUILD_COMPLETE',
  BuildErrored = 'BUILD_ERRORED',
  BuildLimitThresholdExceeded = 'BUILD_LIMIT_THRESHOLD_EXCEEDED',
  BuildPlanCreditThresholdExceeded = 'BUILD_PLAN_CREDIT_THRESHOLD_EXCEEDED',
  SubmissionComplete = 'SUBMISSION_COMPLETE',
  SubmissionErrored = 'SUBMISSION_ERRORED',
  Test = 'TEST'
}

export enum NotificationType {
  Email = 'EMAIL',
  Web = 'WEB'
}

export enum OAuthProvider {
  Apple = 'apple',
  Github = 'github',
  Google = 'google'
}

export enum OfferType {
  /** Addon, or supplementary subscription */
  Addon = 'ADDON',
  /** Advanced Purchase of Paid Resource */
  Prepaid = 'PREPAID',
  /** Term subscription */
  Subscription = 'SUBSCRIPTION'
}

export enum OnboardingDeviceType {
  Device = 'DEVICE',
  Simulator = 'SIMULATOR'
}

export enum OnboardingEnvironment {
  DevBuild = 'DEV_BUILD',
  ExpoGo = 'EXPO_GO'
}

export enum Order {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type PartialManifest = {
  assets: Array<InputMaybe<PartialManifestAsset>>;
  extra?: InputMaybe<Scalars['JSONObject']['input']>;
  launchAsset: PartialManifestAsset;
};

export type PartialManifestAsset = {
  bundleKey: Scalars['String']['input'];
  contentType: Scalars['String']['input'];
  fileExtension?: InputMaybe<Scalars['String']['input']>;
  fileSHA256: Scalars['String']['input'];
  storageKey: Scalars['String']['input'];
};

export enum Permission {
  Admin = 'ADMIN',
  Own = 'OWN',
  Publish = 'PUBLISH',
  PublishProtected = 'PUBLISH_PROTECTED',
  Run = 'RUN',
  View = 'VIEW'
}

/** Which EAS surface a deep link was opened from; PostHog records it as an analytics label. */
export enum PostHogDeepLinkPurpose {
  Dashboard = 'DASHBOARD',
  Observability = 'OBSERVABILITY',
  Project = 'PROJECT'
}

export enum PostHogRegion {
  Eu = 'EU',
  Us = 'US'
}

export type ProjectArchiveSourceInput = {
  bucketKey?: InputMaybe<Scalars['String']['input']>;
  gitRef?: InputMaybe<Scalars['String']['input']>;
  metadataLocation?: InputMaybe<Scalars['String']['input']>;
  type: ProjectArchiveSourceType;
  url?: InputMaybe<Scalars['String']['input']>;
};

export enum ProjectArchiveSourceType {
  Gcs = 'GCS',
  Git = 'GIT',
  None = 'NONE',
  Url = 'URL'
}

export type ProjectMetadataFileInput = {
  bucketKey: Scalars['String']['input'];
  type: ProjectArchiveSourceType;
};

export type ProvisionAdditionalSupabaseProjectInput = {
  appId: Scalars['ID']['input'];
  /** Suffix appended to the app name for the new Supabase project (e.g. preview). */
  projectNameSuffix: Scalars['String']['input'];
  /** A Supabase region code (e.g. us-east-1) or smart-group (americas, emea, apac). */
  region: Scalars['String']['input'];
};

export type ProvisionSupabaseProjectInput = {
  appId: Scalars['ID']['input'];
  /** A Supabase region code (e.g. us-east-1) or smart-group (americas, emea, apac). */
  region: Scalars['String']['input'];
};

export type PublishUpdateGroupInput = {
  assetHostOverride?: InputMaybe<Scalars['String']['input']>;
  assetMapGroup?: InputMaybe<AssetMapGroup>;
  awaitingCodeSigningInfo?: InputMaybe<Scalars['Boolean']['input']>;
  branchId: Scalars['String']['input'];
  environment?: InputMaybe<Scalars['EnvironmentVariableEnvironment']['input']>;
  excludedAssets?: InputMaybe<Array<PartialManifestAsset>>;
  fingerprintInfoGroup?: InputMaybe<FingerprintInfoGroup>;
  gitCommitHash?: InputMaybe<Scalars['String']['input']>;
  isGitWorkingTreeDirty?: InputMaybe<Scalars['Boolean']['input']>;
  manifestHostOverride?: InputMaybe<Scalars['String']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  previousRolloutUpdateToClobberIdGroup?: InputMaybe<UpdateIdGroup>;
  rollBackToEmbeddedInfoGroup?: InputMaybe<UpdateRollBackToEmbeddedGroup>;
  rolloutInfoGroup?: InputMaybe<UpdateRolloutInfoGroup>;
  runtimeVersion: Scalars['String']['input'];
  sourceMapGroup?: InputMaybe<SourceMapGroup>;
  turtleJobRunId?: InputMaybe<Scalars['String']['input']>;
  updateInfoGroup?: InputMaybe<UpdateInfoGroup>;
};

export type RealtimeLogsTargetInput = {
  id: Scalars['ID']['input'];
  type: RealtimeLogsTargetType;
};

export enum RealtimeLogsTargetType {
  Build = 'BUILD',
  JobRun = 'JOB_RUN'
}

export enum RequestMethod {
  Delete = 'DELETE',
  Get = 'GET',
  Head = 'HEAD',
  Options = 'OPTIONS',
  Patch = 'PATCH',
  Post = 'POST',
  Put = 'PUT'
}

export type RequestsFilters = {
  cacheStatus?: InputMaybe<Array<ResponseCacheStatus>>;
  continent?: InputMaybe<Array<ContinentCode>>;
  country?: InputMaybe<Array<Scalars['String']['input']>>;
  hasCustomDomainOrigin?: InputMaybe<Scalars['Boolean']['input']>;
  isAsset?: InputMaybe<Scalars['Boolean']['input']>;
  isCrash?: InputMaybe<Scalars['Boolean']['input']>;
  isLimitExceeded?: InputMaybe<Scalars['Boolean']['input']>;
  isVerifiedBot?: InputMaybe<Scalars['Boolean']['input']>;
  method?: InputMaybe<Array<RequestMethod>>;
  os?: InputMaybe<Array<UserAgentOs>>;
  pathname?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<Array<UserAgentPlatform>>;
  requestId?: InputMaybe<Array<Scalars['WorkerDeploymentRequestID']['input']>>;
  responseType?: InputMaybe<Array<ResponseType>>;
  status?: InputMaybe<Array<Scalars['Int']['input']>>;
  statusType?: InputMaybe<Array<ResponseStatusType>>;
};

export type RequestsOrderBy = {
  direction?: InputMaybe<RequestsOrderByDirection>;
  field: RequestsOrderByField;
};

export enum RequestsOrderByDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum RequestsOrderByField {
  AssetsSum = 'ASSETS_SUM',
  CacheHitRatio = 'CACHE_HIT_RATIO',
  CachePassRatio = 'CACHE_PASS_RATIO',
  CrashesSum = 'CRASHES_SUM',
  Duration = 'DURATION',
  RequestsSum = 'REQUESTS_SUM'
}

export enum ResourceClassExperiment {
  C3D = 'C3D',
  N2 = 'N2'
}

export enum ResponseCacheStatus {
  Hit = 'HIT',
  Miss = 'MISS',
  Pass = 'PASS'
}

export enum ResponseStatusType {
  ClientError = 'CLIENT_ERROR',
  None = 'NONE',
  Redirect = 'REDIRECT',
  ServerError = 'SERVER_ERROR',
  Successful = 'SUCCESSFUL'
}

export enum ResponseType {
  Asset = 'ASSET',
  Crash = 'CRASH',
  Rejected = 'REJECTED',
  Route = 'ROUTE'
}

export type RobotDataInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export enum Role {
  Admin = 'ADMIN',
  Custom = 'CUSTOM',
  Developer = 'DEVELOPER',
  /** @deprecated No longer supported */
  HasAdmin = 'HAS_ADMIN',
  /** @deprecated No longer supported */
  NotAdmin = 'NOT_ADMIN',
  Owner = 'OWNER',
  ReleaseManager = 'RELEASE_MANAGER',
  Runner = 'RUNNER',
  ViewOnly = 'VIEW_ONLY'
}

export type RuntimeBuildsFilterInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
  developmentClient?: InputMaybe<Scalars['Boolean']['input']>;
  distributions?: InputMaybe<Array<DistributionType>>;
  platforms?: InputMaybe<Array<AppPlatform>>;
  releaseChannel?: InputMaybe<Scalars['String']['input']>;
  simulator?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RuntimeDeploymentsFilterInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
};

export type RuntimeFilterInput = {
  /** Only return runtimes shared with this branch */
  branchId?: InputMaybe<Scalars['String']['input']>;
  runtimeVersions?: InputMaybe<Array<Scalars['String']['input']>>;
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};

export type RuntimeUpdatesFilterInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
};

export type SsoUserDataInput = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type SandboxFilterInput = {
  statuses?: InputMaybe<Array<SandboxStatus>>;
};

export enum SandboxOperatingSystem {
  Linux = 'LINUX',
  Macos = 'MACOS'
}

export type SandboxProjectArchiveInput = {
  gitRef?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export enum SandboxResourceClass {
  Large = 'LARGE',
  Medium = 'MEDIUM'
}

export enum SandboxStatus {
  Errored = 'ERRORED',
  Running = 'RUNNING',
  Starting = 'STARTING',
  Stopped = 'STOPPED'
}

export type SecondFactorDeviceConfiguration = {
  isPrimary: Scalars['Boolean']['input'];
  method: SecondFactorMethod;
  name: Scalars['String']['input'];
};

export enum SecondFactorMethod {
  /** Google Authenticator (TOTP) */
  Authenticator = 'AUTHENTICATOR',
  /**
   * SMS
   * @deprecated No longer supported
   */
  Sms = 'SMS'
}

export type SendConvexTeamInviteToVerifiedEmailInput = {
  convexTeamConnectionId: Scalars['ID']['input'];
};

export type SetSupabaseConnectionOrganizationInput = {
  organizationSlug: Scalars['String']['input'];
  supabaseConnectionId: Scalars['ID']['input'];
};

export type SetupConvexProjectInput = {
  appId: Scalars['ID']['input'];
  convexTeamConnectionId: Scalars['ID']['input'];
  deploymentRegion?: InputMaybe<Scalars['String']['input']>;
  projectName: Scalars['String']['input'];
};

export type SetupPostHogProjectInput = {
  appId: Scalars['ID']['input'];
  posthogOrganizationConnectionId: Scalars['ID']['input'];
};

export type SourceMapGroup = {
  android?: InputMaybe<SourceMapSourceInput>;
  ios?: InputMaybe<SourceMapSourceInput>;
};

export type SourceMapSourceInput = {
  bucketKey: Scalars['String']['input'];
  type: SourceMapSourceType;
};

export enum SourceMapSourceType {
  Gcs = 'GCS'
}

export enum StandardOffer {
  /** $29 USD per month, 30 day trial */
  Default = 'DEFAULT',
  /** $800 USD per month */
  Support = 'SUPPORT',
  /** $29 USD per month, 1 year trial */
  YcDeals = 'YC_DEALS',
  /** $348 USD per year, 30 day trial */
  YearlySub = 'YEARLY_SUB'
}

export type StartClaudeConnectionInput = {
  accountId: Scalars['ID']['input'];
};

export type StartGitHubAppRegistrationInput = {
  accountId: Scalars['ID']['input'];
  /** Organization to register the app under; omit to register under the signed-in user's account. */
  org?: InputMaybe<Scalars['String']['input']>;
  /** URL of the GitHub Enterprise instance, e.g. https://github.example.com or https://example.ghe.com. */
  origin: Scalars['String']['input'];
};

/** Possible Incident impact values from Expo status page API. */
export enum StatuspageIncidentImpact {
  Critical = 'CRITICAL',
  Maintenance = 'MAINTENANCE',
  Major = 'MAJOR',
  Minor = 'MINOR',
  None = 'NONE'
}

/** Possible Incident statuses from Expo status page API. */
export enum StatuspageIncidentStatus {
  Completed = 'COMPLETED',
  Identified = 'IDENTIFIED',
  Investigating = 'INVESTIGATING',
  InProgress = 'IN_PROGRESS',
  Monitoring = 'MONITORING',
  Resolved = 'RESOLVED',
  Scheduled = 'SCHEDULED',
  Verifying = 'VERIFYING'
}

/** Name of a service monitored by Expo status page. */
export enum StatuspageServiceName {
  EasBuild = 'EAS_BUILD',
  EasSubmit = 'EAS_SUBMIT',
  EasUpdate = 'EAS_UPDATE',
  EasWorkflows = 'EAS_WORKFLOWS',
  GithubApiRequests = 'GITHUB_API_REQUESTS',
  GithubWebhooks = 'GITHUB_WEBHOOKS'
}

/** Possible statuses for a service. */
export enum StatuspageServiceStatus {
  DegradedPerformance = 'DEGRADED_PERFORMANCE',
  MajorOutage = 'MAJOR_OUTAGE',
  Operational = 'OPERATIONAL',
  PartialOutage = 'PARTIAL_OUTAGE',
  UnderMaintenance = 'UNDER_MAINTENANCE'
}

export enum SubmissionAndroidReleaseStatus {
  Completed = 'COMPLETED',
  Draft = 'DRAFT',
  Halted = 'HALTED',
  InProgress = 'IN_PROGRESS'
}

export type SubmissionArchiveSourceInput = {
  /** Required if the archive source type is GCS_BUILD_APPLICATION_ARCHIVE, GCS_BUILD_APPLICATION_ARCHIVE_ORCHESTRATOR or GCS_SUBMIT_ARCHIVE */
  bucketKey?: InputMaybe<Scalars['String']['input']>;
  type: SubmissionArchiveSourceType;
  /** Required if the archive source type is URL */
  url?: InputMaybe<Scalars['String']['input']>;
};

export enum SubmissionArchiveSourceType {
  /** @deprecated Submit with the build ID instead. */
  GcsBuildApplicationArchive = 'GCS_BUILD_APPLICATION_ARCHIVE',
  /** @deprecated Submit with the build ID instead. */
  GcsBuildApplicationArchiveOrchestrator = 'GCS_BUILD_APPLICATION_ARCHIVE_ORCHESTRATOR',
  GcsSubmitArchive = 'GCS_SUBMIT_ARCHIVE',
  Url = 'URL'
}

export type SubmissionFilter = {
  platform?: InputMaybe<AppPlatform>;
  status?: InputMaybe<SubmissionStatus>;
};

export enum SubmissionPriority {
  High = 'HIGH',
  Normal = 'NORMAL'
}

export enum SubmissionStatus {
  AwaitingBuild = 'AWAITING_BUILD',
  Canceled = 'CANCELED',
  Errored = 'ERRORED',
  Finished = 'FINISHED',
  InProgress = 'IN_PROGRESS',
  InQueue = 'IN_QUEUE'
}

export enum SupabaseAdvisorLintLevel {
  Error = 'ERROR',
  Info = 'INFO',
  Warn = 'WARN'
}

export enum SupabaseAdvisorType {
  Performance = 'PERFORMANCE',
  Security = 'SECURITY'
}

export enum TargetEntityMutationType {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type TimelineActivityFilterInput = {
  channels?: InputMaybe<Array<Scalars['String']['input']>>;
  platforms?: InputMaybe<Array<AppPlatform>>;
  releaseChannels?: InputMaybe<Array<Scalars['String']['input']>>;
  types?: InputMaybe<Array<ActivityTimelineProjectActivityType>>;
};

export type TurtleSshConnectionConfigInput = {
  reconnecting?: InputMaybe<Scalars['Boolean']['input']>;
  secret: Scalars['String']['input'];
  type: TurtleSshTransportType;
};

export type TurtleSshSessionSettingsInput = {
  idleTimeoutSeconds: Scalars['Int']['input'];
};

export type TurtleSshTargetInput = {
  id: Scalars['ID']['input'];
  type: TurtleSshTargetType;
};

export enum TurtleSshTargetType {
  Build = 'BUILD',
  JobRun = 'JOB_RUN'
}

export enum TurtleSshTransportType {
  UptermV1 = 'UPTERM_V1'
}

export type UpdateAgentProviderConnectionInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateDeviceRunSessionInput = {
  /**
   * New human-readable label for the session, at most 255 characters after leading
   * and trailing whitespace is trimmed. Pass null to clear the name so clients fall
   * back to identifying the session by id.
   */
  name?: InputMaybe<Scalars['String']['input']>;
  /**
   * Replace the session tags. Tags are trimmed, lowercased and deduplicated.
   * Pass an empty list or null to clear them. Omit to leave tags unchanged.
   */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateDiffReceiptFilterInput = {
  /**
   * Excludes diff receipts whose diffs have been downloaded.
   * Downloads are determined from ClickHouse metrics. Results are
   * approximate when more than 1000 downloaded diffs exist.
   */
  omitDownloadedDiffs?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateDiffReceiptOrderByClause = {
  direction?: InputMaybe<UpdateDiffReceiptOrderByDirection>;
  field: UpdateDiffReceiptOrderByField;
  stateOrder?: InputMaybe<Array<UpdateDiffReceiptStateValue>>;
};

export enum UpdateDiffReceiptOrderByDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum UpdateDiffReceiptOrderByField {
  CreatedAt = 'CREATED_AT',
  State = 'STATE'
}

export enum UpdateDiffReceiptStateValue {
  Failure = 'FAILURE',
  InProgress = 'IN_PROGRESS',
  Queued = 'QUEUED',
  Success = 'SUCCESS',
  WontCompute = 'WONT_COMPUTE'
}

export type UpdateEnvironmentVariableInput = {
  environments?: InputMaybe<Array<Scalars['EnvironmentVariableEnvironment']['input']>>;
  fileName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<EnvironmentSecretType>;
  value?: InputMaybe<Scalars['String']['input']>;
  visibility?: InputMaybe<EnvironmentVariableVisibility>;
};

export type UpdateFilterInput = {
  fingerprintHash?: InputMaybe<Scalars['String']['input']>;
  hasFingerprint?: InputMaybe<Scalars['Boolean']['input']>;
  runtimeVersion?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGitHubBuildTriggerInput = {
  autoSubmit: Scalars['Boolean']['input'];
  buildProfile: Scalars['String']['input'];
  environment?: InputMaybe<Scalars['EnvironmentVariableEnvironment']['input']>;
  executionBehavior: GitHubBuildTriggerExecutionBehavior;
  isActive: Scalars['Boolean']['input'];
  platform: AppPlatform;
  sourcePattern: Scalars['String']['input'];
  submitProfile?: InputMaybe<Scalars['String']['input']>;
  targetPattern?: InputMaybe<Scalars['String']['input']>;
  type: GitHubBuildTriggerType;
};

export type UpdateGitHubJobRunTriggerInput = {
  isActive: Scalars['Boolean']['input'];
  sourcePattern: Scalars['String']['input'];
  targetPattern?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGitHubRepositorySettingsInput = {
  baseDirectory: Scalars['String']['input'];
};

export type UpdateIdGroup = {
  android?: InputMaybe<Scalars['ID']['input']>;
  ios?: InputMaybe<Scalars['ID']['input']>;
  web?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateInfoGroup = {
  android?: InputMaybe<PartialManifest>;
  ios?: InputMaybe<PartialManifest>;
  web?: InputMaybe<PartialManifest>;
};

export type UpdateRollBackToEmbeddedGroup = {
  android?: InputMaybe<Scalars['Boolean']['input']>;
  ios?: InputMaybe<Scalars['Boolean']['input']>;
  web?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateRolloutInfo = {
  rolloutControlUpdateId?: InputMaybe<Scalars['ID']['input']>;
  rolloutPercentage: Scalars['Int']['input'];
};

export type UpdateRolloutInfoGroup = {
  android?: InputMaybe<UpdateRolloutInfo>;
  ios?: InputMaybe<UpdateRolloutInfo>;
  web?: InputMaybe<UpdateRolloutInfo>;
};

export type UpdateVexoAppInput = {
  domain?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  owner?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatesFilter = {
  platform?: InputMaybe<AppPlatform>;
  runtimeVersions?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdatesFilterV2 = {
  platform?: InputMaybe<AppPlatform>;
  runtimeVersions?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdatesTimelineFilter = {
  channel?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<AppPlatform>;
  runtimeVersions?: InputMaybe<Array<Scalars['String']['input']>>;
  /**
   * Case-insensitive substring match on update group message, branch name, and runtime version,
   * plus prefix match on update ID, update group ID, and git commit hash.
   * Embedded updates are matched on channel, runtime version, and ID prefix.
   */
  searchTerm?: InputMaybe<Scalars['String']['input']>;
  types?: InputMaybe<Array<UpdatesTimelineItemType>>;
};

export enum UpdatesTimelineItemType {
  EmbeddedUpdate = 'EMBEDDED_UPDATE',
  UpdateGroup = 'UPDATE_GROUP'
}

export type UploadEmbeddedUpdateInput = {
  appId: Scalars['ID']['input'];
  channel: Scalars['String']['input'];
  /** UUID baked into the binary by expo-updates at build time (from app.manifest id field). */
  embeddedUpdateId: Scalars['ID']['input'];
  platform: AppPlatform;
  runtimeVersion: Scalars['String']['input'];
  turtleBuildId?: InputMaybe<Scalars['ID']['input']>;
};

export enum UploadSessionType {
  EasBuildGcsProjectMetadata = 'EAS_BUILD_GCS_PROJECT_METADATA',
  EasBuildGcsProjectSources = 'EAS_BUILD_GCS_PROJECT_SOURCES',
  /** @deprecated Use EAS_BUILD_GCS_PROJECT_SOURCES instead. */
  EasBuildProjectSources = 'EAS_BUILD_PROJECT_SOURCES',
  EasShareGcsAppArchive = 'EAS_SHARE_GCS_APP_ARCHIVE',
  /** @deprecated Use EAS_SUBMIT_GCS_APP_ARCHIVE instead. */
  EasSubmitAppArchive = 'EAS_SUBMIT_APP_ARCHIVE',
  EasSubmitGcsAppArchive = 'EAS_SUBMIT_GCS_APP_ARCHIVE',
  EasUpdateAssetsMetadata = 'EAS_UPDATE_ASSETS_METADATA',
  EasUpdateFingerprint = 'EAS_UPDATE_FINGERPRINT',
  EasUpdateSourceMaps = 'EAS_UPDATE_SOURCE_MAPS'
}

export type UsageBudgetLimitsInput = {
  builds?: InputMaybe<Scalars['Int']['input']>;
  concurrentSandboxes?: InputMaybe<Scalars['Int']['input']>;
  sandboxMinutes?: InputMaybe<Scalars['Int']['input']>;
  simulatorMinutes?: InputMaybe<Scalars['Int']['input']>;
};

export enum UsageMetricType {
  Bandwidth = 'BANDWIDTH',
  Build = 'BUILD',
  Event = 'EVENT',
  Minute = 'MINUTE',
  Request = 'REQUEST',
  Update = 'UPDATE',
  User = 'USER'
}

export enum UsageMetricsGranularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Minute = 'MINUTE',
  Total = 'TOTAL'
}

export type UsageMetricsTimespan = {
  end: Scalars['DateTime']['input'];
  start: Scalars['DateTime']['input'];
};

export enum UserAgentBrowser {
  AndroidMobile = 'ANDROID_MOBILE',
  Chrome = 'CHROME',
  ChromeIos = 'CHROME_IOS',
  Edge = 'EDGE',
  FacebookMobile = 'FACEBOOK_MOBILE',
  Firefox = 'FIREFOX',
  FirefoxIos = 'FIREFOX_IOS',
  InternetExplorer = 'INTERNET_EXPLORER',
  Konqueror = 'KONQUEROR',
  Mozilla = 'MOZILLA',
  Opera = 'OPERA',
  Safari = 'SAFARI',
  SafariMobile = 'SAFARI_MOBILE',
  SamsungInternet = 'SAMSUNG_INTERNET',
  UcBrowser = 'UC_BROWSER'
}

export enum UserAgentOs {
  Android = 'ANDROID',
  ChromeOs = 'CHROME_OS',
  Ios = 'IOS',
  IpadOs = 'IPAD_OS',
  Linux = 'LINUX',
  MacOs = 'MAC_OS',
  Windows = 'WINDOWS'
}

export enum UserAgentPlatform {
  Android = 'ANDROID',
  Apple = 'APPLE',
  Unknown = 'UNKNOWN',
  Web = 'WEB'
}

export type UserAuditLogExportInput = {
  createdAfter: Scalars['String']['input'];
  createdBefore: Scalars['String']['input'];
  format: AuditLogsExportFormat;
  targetEntityMutationType?: InputMaybe<Array<TargetEntityMutationType>>;
  targetEntityTypeName?: InputMaybe<Array<UserEntityTypeName>>;
  userId: Scalars['ID']['input'];
};

export type UserAuditLogFilterInput = {
  entityTypes?: InputMaybe<Array<UserEntityTypeName>>;
  mutationTypes?: InputMaybe<Array<TargetEntityMutationType>>;
};

export type UserDataInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  fullName?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  profilePhoto?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export enum UserEntityTypeName {
  AccessTokenEntity = 'AccessTokenEntity',
  DiscordUserEntity = 'DiscordUserEntity',
  GitHubUserEntity = 'GitHubUserEntity',
  OAuthIdentityEntity = 'OAuthIdentityEntity',
  PartnerProvisionedActorEntity = 'PartnerProvisionedActorEntity',
  PasswordEntity = 'PasswordEntity',
  SsoUserEntity = 'SSOUserEntity',
  UserEntity = 'UserEntity',
  UserPasskeyCredentialEntity = 'UserPasskeyCredentialEntity',
  UserPermissionEntity = 'UserPermissionEntity',
  UserSecondFactorBackupCodesEntity = 'UserSecondFactorBackupCodesEntity',
  UserSecondFactorDeviceEntity = 'UserSecondFactorDeviceEntity'
}

export enum UserSpecifiedAccountUsage {
  Company = 'COMPANY',
  Personal = 'PERSONAL'
}

export type WebNotificationUpdateReadStateInput = {
  id: Scalars['ID']['input'];
  isRead: Scalars['Boolean']['input'];
};

export type WebhookFilter = {
  event?: InputMaybe<WebhookType>;
};

export type WebhookInput = {
  event: WebhookType;
  secret: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export enum WebhookType {
  Build = 'BUILD',
  Submit = 'SUBMIT'
}

export enum WorkerDeploymentCrashKind {
  ExceededCpu = 'EXCEEDED_CPU',
  ExceededMemory = 'EXCEEDED_MEMORY',
  ExceededSubrequests = 'EXCEEDED_SUBREQUESTS',
  Generic = 'GENERIC',
  Internal = 'INTERNAL',
  ResponseStreamDisconnected = 'RESPONSE_STREAM_DISCONNECTED'
}

export enum WorkerDeploymentLogLevel {
  Debug = 'DEBUG',
  Error = 'ERROR',
  Fatal = 'FATAL',
  Info = 'INFO',
  Log = 'LOG',
  Warn = 'WARN'
}

export enum WorkerLoggerLevel {
  Debug = 'DEBUG',
  Error = 'ERROR',
  Fatal = 'FATAL',
  Info = 'INFO',
  Trace = 'TRACE',
  Warn = 'WARN'
}

export enum WorkflowArtifactStorageType {
  Gcs = 'GCS',
  R2 = 'R2'
}

export type WorkflowCachingConfigInput = {
  /**
   * Pass true or false to explicitly enable or disable, null to reset to the account-level
   * default, or omit the field to leave it unchanged.
   */
  ccacheEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * Pass true or false to explicitly enable or disable, null to reset to the default
   * (disabled), or omit the field to leave it unchanged.
   */
  gradleCacheEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type WorkflowDeviceTestCaseHistoryFiltersInput = {
  gitRefs?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Runs whose platform is unknown match no platforms filter. */
  platforms?: InputMaybe<Array<AppPlatform>>;
  workflowIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type WorkflowDeviceTestCaseInsightsFiltersInput = {
  gitRefs?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Runs whose platform is unknown match no platforms filter. */
  platforms?: InputMaybe<Array<AppPlatform>>;
  statuses?: InputMaybe<Array<WorkflowDeviceTestCaseStatusFilter>>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  workflowIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export enum WorkflowDeviceTestCaseInsightsTimeSeriesGranularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Minute = 'MINUTE'
}

export type WorkflowDeviceTestCaseInsightsTimespanInput = {
  end: Scalars['DateTime']['input'];
  start: Scalars['DateTime']['input'];
};

export type WorkflowDeviceTestCaseResultInput = {
  /** Execution time in milliseconds. Must be non-negative. */
  duration?: InputMaybe<Scalars['Int']['input']>;
  /** Error message if failed. Truncated to 4096 characters. */
  errorMessage?: InputMaybe<Scalars['String']['input']>;
  /** Test case name (e.g., "login", "checkout"). Max 255 characters. */
  name: Scalars['String']['input'];
  /**
   * Path to the test file (e.g., "flows/login.yaml"). Max 1024 characters.
   * Used as natural key for deduplication.
   */
  path: Scalars['String']['input'];
  /** Custom properties from test configuration. Stored as key-value pairs. */
  properties?: InputMaybe<Scalars['JSONObject']['input']>;
  /** 0-indexed attempt number for this test case. 0 = first attempt, 1 = first retry, etc. */
  retryCount?: InputMaybe<Scalars['Int']['input']>;
  /** Execution result. */
  status: WorkflowDeviceTestCaseStatus;
  /** Tags defined in the test config. Each tag max 255 characters. */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum WorkflowDeviceTestCaseSortDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum WorkflowDeviceTestCaseStatSortField {
  Fails = 'FAILS',
  Flakes = 'FLAKES',
  FlakeRate = 'FLAKE_RATE',
  LastRun = 'LAST_RUN',
  P90Duration = 'P90_DURATION',
  PassRate = 'PASS_RATE',
  Runs = 'RUNS'
}

/** Status of a device test case execution. */
export enum WorkflowDeviceTestCaseStatus {
  Failed = 'FAILED',
  Passed = 'PASSED'
}

/**
 * Mutually exclusive — matches the chart bucket semantics (passedClean / flaky / failed).
 * PASSED_CLEAN  = is_final_attempt=1 AND status=passed AND is_flaky=0
 * FLAKY         = is_final_attempt=1 AND is_flaky=1 (still a pass, just with retries)
 * FAILED        = is_final_attempt=1 AND status=failed
 */
export enum WorkflowDeviceTestCaseStatusFilter {
  Failed = 'FAILED',
  Flaky = 'FLAKY',
  PassedClean = 'PASSED_CLEAN'
}

export enum WorkflowDispatchInputType {
  Boolean = 'BOOLEAN',
  Choice = 'CHOICE',
  Environment = 'ENVIRONMENT',
  Number = 'NUMBER',
  String = 'STRING'
}

export enum WorkflowJobReviewDecision {
  Approved = 'APPROVED',
  Rejected = 'REJECTED'
}

export enum WorkflowJobStatus {
  ActionRequired = 'ACTION_REQUIRED',
  Canceled = 'CANCELED',
  Failure = 'FAILURE',
  InProgress = 'IN_PROGRESS',
  New = 'NEW',
  PendingCancel = 'PENDING_CANCEL',
  Skipped = 'SKIPPED',
  Success = 'SUCCESS'
}

export enum WorkflowJobType {
  Agent = 'AGENT',
  AppleDeviceRegistrationRequest = 'APPLE_DEVICE_REGISTRATION_REQUEST',
  BranchDelete = 'BRANCH_DELETE',
  Build = 'BUILD',
  Custom = 'CUSTOM',
  Deploy = 'DEPLOY',
  Doc = 'DOC',
  Email = 'EMAIL',
  Fingerprint = 'FINGERPRINT',
  GetBuild = 'GET_BUILD',
  GithubComment = 'GITHUB_COMMENT',
  MaestroCloud = 'MAESTRO_CLOUD',
  MaestroTest = 'MAESTRO_TEST',
  Repack = 'REPACK',
  RequireApproval = 'REQUIRE_APPROVAL',
  Slack = 'SLACK',
  Submission = 'SUBMISSION',
  Testflight = 'TESTFLIGHT',
  Update = 'UPDATE',
  UpdateRollout = 'UPDATE_ROLLOUT',
  WorkflowCall = 'WORKFLOW_CALL'
}

export type WorkflowProjectSourceInput = {
  easJsonBucketKey?: InputMaybe<Scalars['String']['input']>;
  packageJsonBucketKey?: InputMaybe<Scalars['String']['input']>;
  projectArchiveBucketKey: Scalars['String']['input'];
  projectRootDirectory?: InputMaybe<Scalars['String']['input']>;
  type: WorkflowProjectSourceType;
};

export enum WorkflowProjectSourceType {
  Gcs = 'GCS'
}

export type WorkflowReferencedFileInput = {
  fileName: Scalars['String']['input'];
  yamlConfig: Scalars['String']['input'];
};

export type WorkflowRevisionInput = {
  fileName: Scalars['String']['input'];
  /**
   * Other workflow files of the project that `uses` jobs reference, by bare file name.
   * Required when the workflow has `uses` jobs. Every uploaded file is stored as a
   * revision and pinned on the run, whether or not a job calls it.
   */
  referencedFiles?: InputMaybe<Array<WorkflowReferencedFileInput>>;
  yamlConfig: Scalars['String']['input'];
};

export type WorkflowRunFilterInput = {
  requestedGitRef?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<WorkflowRunStatus>;
  timeRange?: InputMaybe<WorkflowRunTimeRangeInput>;
};

export type WorkflowRunGitBranchFilterInput = {
  searchTerm?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Git metadata for a run started from an uploaded project. The commit must exist in the
 * project's linked GitHub repository. The run records the branch and commit but is not
 * linked to the repository.
 */
export type WorkflowRunGitInput = {
  /** Branch name such as "main". Stored as refs/heads/<branch>. Fully qualified refs are rejected. */
  branch: Scalars['String']['input'];
  /** Full commit SHA. The commit message is read from GitHub. */
  commitHash: Scalars['String']['input'];
};

export type WorkflowRunInput = {
  git?: InputMaybe<WorkflowRunGitInput>;
  inputs?: InputMaybe<Scalars['JSONObject']['input']>;
  projectSource: WorkflowProjectSourceInput;
  ssh?: InputMaybe<WorkflowRunSshInput>;
};

/**
 * Enables ssh on the run's VM jobs. Presence turns ssh on; idleTimeoutSeconds is optional,
 * defaults server-side, and is validated against a supported range.
 */
export type WorkflowRunSshInput = {
  idleTimeoutSeconds?: InputMaybe<Scalars['Int']['input']>;
};

export enum WorkflowRunStatus {
  ActionRequired = 'ACTION_REQUIRED',
  Canceled = 'CANCELED',
  Failure = 'FAILURE',
  InProgress = 'IN_PROGRESS',
  New = 'NEW',
  Success = 'SUCCESS',
  Waiting = 'WAITING'
}

export type WorkflowRunTimeRangeInput = {
  earliest?: InputMaybe<Scalars['DateTime']['input']>;
  latest?: InputMaybe<Scalars['DateTime']['input']>;
};

export enum WorkflowRunTriggerEventType {
  AppStoreConnectAppVersionStateChanged = 'APP_STORE_CONNECT_APP_VERSION_STATE_CHANGED',
  AppStoreConnectBetaFeedbackSubmitted = 'APP_STORE_CONNECT_BETA_FEEDBACK_SUBMITTED',
  AppStoreConnectBuildUploadStateChanged = 'APP_STORE_CONNECT_BUILD_UPLOAD_STATE_CHANGED',
  AppStoreConnectExternalBetaStateChanged = 'APP_STORE_CONNECT_EXTERNAL_BETA_STATE_CHANGED',
  EasSubmit = 'EAS_SUBMIT',
  ExpoLaunch = 'EXPO_LAUNCH',
  GithubPullRequestBaseRefChanged = 'GITHUB_PULL_REQUEST_BASE_REF_CHANGED',
  GithubPullRequestCommentCreated = 'GITHUB_PULL_REQUEST_COMMENT_CREATED',
  GithubPullRequestCommentDeleted = 'GITHUB_PULL_REQUEST_COMMENT_DELETED',
  GithubPullRequestCommentEdited = 'GITHUB_PULL_REQUEST_COMMENT_EDITED',
  GithubPullRequestEdited = 'GITHUB_PULL_REQUEST_EDITED',
  GithubPullRequestLabeled = 'GITHUB_PULL_REQUEST_LABELED',
  GithubPullRequestOpened = 'GITHUB_PULL_REQUEST_OPENED',
  GithubPullRequestReadyForReview = 'GITHUB_PULL_REQUEST_READY_FOR_REVIEW',
  GithubPullRequestReopened = 'GITHUB_PULL_REQUEST_REOPENED',
  GithubPullRequestSynchronize = 'GITHUB_PULL_REQUEST_SYNCHRONIZE',
  GithubPush = 'GITHUB_PUSH',
  GithubRefDelete = 'GITHUB_REF_DELETE',
  Manual = 'MANUAL',
  ObserveNewError = 'OBSERVE_NEW_ERROR',
  RepackExpoGo = 'REPACK_EXPO_GO',
  Schedule = 'SCHEDULE',
  SentryIssueArchived = 'SENTRY_ISSUE_ARCHIVED',
  SentryIssueAssigned = 'SENTRY_ISSUE_ASSIGNED',
  SentryIssueCreated = 'SENTRY_ISSUE_CREATED',
  SentryIssueResolved = 'SENTRY_ISSUE_RESOLVED',
  SentryIssueUnresolved = 'SENTRY_ISSUE_UNRESOLVED'
}

export enum WorkflowsInsightsExportFormat {
  Csv = 'CSV',
  Ndjson = 'NDJSON'
}

export type WorkflowsInsightsExportInput = {
  appId: Scalars['ID']['input'];
  filters?: InputMaybe<WorkflowsInsightsFiltersInput>;
  format: WorkflowsInsightsExportFormat;
  timespan: WorkflowsInsightsTimespanInput;
};

export type WorkflowsInsightsFiltersInput = {
  gitRefRequested?: InputMaybe<Array<Scalars['String']['input']>>;
  statuses?: InputMaybe<Array<WorkflowRunStatus>>;
  triggerEventTypes?: InputMaybe<Array<WorkflowRunTriggerEventType>>;
  workflowIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export enum WorkflowsInsightsRunsOverTimeGranularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Minute = 'MINUTE'
}

export type WorkflowsInsightsTimespanInput = {
  end: Scalars['DateTime']['input'];
  start: Scalars['DateTime']['input'];
};

export type GetAppBuildForUpdateQueryVariables = Exact<{
  appId: Scalars['String']['input'];
  platform: AppPlatform;
  distribution: DistributionType;
  runtimeVersion?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetAppBuildForUpdateQuery = { __typename?: 'RootQuery', app: { __typename?: 'AppQuery', byId: { __typename?: 'App', id: string, name: string, buildsPaginated: { __typename?: 'AppBuildsConnection', edges: Array<{ __typename?: 'AppBuildEdge', node: { __typename: 'Build', appIdentifier?: string | null, expirationDate?: any | null, id: string, runtime?: { __typename?: 'Runtime', version: string } | null, artifacts?: { __typename?: 'BuildArtifacts', buildUrl?: string | null } | null } }> } } } };

export type GetAppHasDevClientBuildsQueryVariables = Exact<{
  appId: Scalars['String']['input'];
}>;


export type GetAppHasDevClientBuildsQuery = { __typename?: 'RootQuery', app: { __typename?: 'AppQuery', byId: { __typename?: 'App', id: string, name: string, hasDevClientBuilds: { __typename?: 'AppBuildsConnection', edges: Array<{ __typename?: 'AppBuildEdge', node: { __typename: 'Build', appIdentifier?: string | null, id: string } }> } } } };

export type GetRemoteSimulatorAccountsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRemoteSimulatorAccountsQuery = { __typename?: 'RootQuery', meUserActor?: { __typename?: 'SSOUser', id: string, accounts: Array<{ __typename?: 'Account', id: string, name: string, subscription?: { __typename?: 'SubscriptionDetails', planId?: string | null } | null }> } | { __typename?: 'User', id: string, accounts: Array<{ __typename?: 'Account', id: string, name: string, subscription?: { __typename?: 'SubscriptionDetails', planId?: string | null } | null }> } | null };

export type GetAccountDeviceRunSessionsQueryVariables = Exact<{
  accountId: Scalars['String']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetAccountDeviceRunSessionsQuery = { __typename?: 'RootQuery', account: { __typename?: 'AccountQuery', byId: { __typename?: 'Account', id: string, deviceRunSessionsPaginated: { __typename?: 'AccountDeviceRunSessionsConnection', edges: Array<{ __typename?: 'AccountDeviceRunSessionsEdge', node: { __typename?: 'DeviceRunSession', id: string, name?: string | null, status: DeviceRunSessionStatus, type: DeviceRunSessionType, platform: AppPlatform, deviceIdentifier?: string | null, startedAt?: any | null, createdAt: any, initiatingActor?: { __typename?: 'PartnerActor', id: string } | { __typename?: 'Robot', id: string } | { __typename?: 'SSOUser', id: string } | { __typename?: 'User', id: string } | null, app: { __typename?: 'App', id: string, slug: string, ownerAccount: { __typename?: 'Account', id: string, name: string } } } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } } } };

export type GetDeviceRunSessionStatusQueryVariables = Exact<{
  deviceRunSessionId: Scalars['ID']['input'];
}>;


export type GetDeviceRunSessionStatusQuery = { __typename?: 'RootQuery', deviceRunSessions: { __typename?: 'DeviceRunSessionQuery', byId: { __typename?: 'DeviceRunSession', id: string, status: DeviceRunSessionStatus } } };

export type GetDeviceRunSessionControllerQueryVariables = Exact<{
  deviceRunSessionId: Scalars['ID']['input'];
}>;


export type GetDeviceRunSessionControllerQuery = { __typename?: 'RootQuery', deviceRunSessions: { __typename?: 'DeviceRunSessionQuery', byId: { __typename?: 'DeviceRunSession', id: string, status: DeviceRunSessionStatus, platform: AppPlatform, remoteConfig?: { __typename: 'AgentDeviceRunSessionRemoteConfig', agentDeviceRemoteSessionUrl: string, agentDeviceRemoteSessionToken: string } | { __typename: 'AppiumRunSessionRemoteConfig' } | { __typename: 'ArgentRunSessionRemoteConfig' } | { __typename: 'ServeSimRunSessionRemoteConfig' } | { __typename: 'WebPreviewOnlyRunSessionRemoteConfig' } | null } } };

export type CreateDeviceRunSessionMutationVariables = Exact<{
  deviceRunSessionInput: CreateDeviceRunSessionInput;
}>;


export type CreateDeviceRunSessionMutation = { __typename?: 'RootMutation', deviceRunSession: { __typename?: 'DeviceRunSessionMutation', createDeviceRunSession: { __typename?: 'DeviceRunSession', id: string, status: DeviceRunSessionStatus } } };

export type EnsureDeviceRunSessionStoppedMutationVariables = Exact<{
  deviceRunSessionId: Scalars['ID']['input'];
}>;


export type EnsureDeviceRunSessionStoppedMutation = { __typename?: 'RootMutation', deviceRunSession: { __typename?: 'DeviceRunSessionMutation', ensureDeviceRunSessionStopped: { __typename?: 'DeviceRunSession', id: string, status: DeviceRunSessionStatus } } };

export type RemoteSimulatorBuildFragment = { __typename?: 'Build', id: string, appBuildVersion?: string | null, appVersion?: string | null, buildMode?: BuildMode | null, createdAt: any, developmentClient?: boolean | null, isForIosSimulator: boolean, platform: AppPlatform, runtimeVersion?: string | null, artifacts?: { __typename?: 'BuildArtifacts', applicationArchiveUrl?: string | null } | null, runtime?: { __typename?: 'Runtime', id: string, version: string } | null };

export type GetRemoteSimulatorOptionsQueryVariables = Exact<{
  appId: Scalars['String']['input'];
}>;


export type GetRemoteSimulatorOptionsQuery = { __typename?: 'RootQuery', deviceRunSessions: { __typename?: 'DeviceRunSessionQuery', profiles: { __typename?: 'DeviceRunSessionProfiles', android: { __typename?: 'AndroidDeviceRunSessionProfiles', devices: Array<{ __typename?: 'AndroidDeviceRunSessionDevice', identifier: string, displayName: string }> }, ios: { __typename?: 'IosDeviceRunSessionProfiles', devices: Array<{ __typename?: 'IosDeviceRunSessionDevice', identifier: string, displayName: string }> } } }, expoGoBuild: { __typename?: 'ExpoGoBuildQuery', supportedSdkVersions: Array<{ __typename?: 'ExpoGoSdkVersion', sdkVersion: string, isLatest: boolean, isBeta: boolean, isDeprecated: boolean }> }, app: { __typename?: 'AppQuery', byId: { __typename?: 'App', id: string, iosBuilds: { __typename?: 'AppBuildsConnection', edges: Array<{ __typename?: 'AppBuildEdge', node: { __typename: 'Build', id: string, appBuildVersion?: string | null, appVersion?: string | null, buildMode?: BuildMode | null, createdAt: any, developmentClient?: boolean | null, isForIosSimulator: boolean, platform: AppPlatform, runtimeVersion?: string | null, artifacts?: { __typename?: 'BuildArtifacts', applicationArchiveUrl?: string | null } | null, runtime?: { __typename?: 'Runtime', id: string, version: string } | null } }> }, androidBuilds: { __typename?: 'AppBuildsConnection', edges: Array<{ __typename?: 'AppBuildEdge', node: { __typename: 'Build', id: string, appBuildVersion?: string | null, appVersion?: string | null, buildMode?: BuildMode | null, createdAt: any, developmentClient?: boolean | null, isForIosSimulator: boolean, platform: AppPlatform, runtimeVersion?: string | null, artifacts?: { __typename?: 'BuildArtifacts', applicationArchiveUrl?: string | null } | null, runtime?: { __typename?: 'Runtime', id: string, version: string } | null } }> } } } };

export const RemoteSimulatorBuildFragmentDoc = gql`
    fragment RemoteSimulatorBuild on Build {
  id
  appBuildVersion
  appVersion
  artifacts {
    applicationArchiveUrl
  }
  buildMode
  createdAt
  developmentClient
  isForIosSimulator
  platform
  runtime {
    id
    version
  }
  runtimeVersion
}
    `;
export const GetAppBuildForUpdateDocument = gql`
    query getAppBuildForUpdate($appId: String!, $platform: AppPlatform!, $distribution: DistributionType!, $runtimeVersion: String) {
  app {
    byId(appId: $appId) {
      id
      name
      buildsPaginated(
        first: 1
        filter: {platforms: [$platform], distributions: [$distribution], developmentClient: true, runtimeVersion: $runtimeVersion}
      ) {
        edges {
          node {
            __typename
            id
            ... on Build {
              appIdentifier
              runtime {
                version
              }
              expirationDate
              artifacts {
                buildUrl
              }
            }
          }
        }
      }
    }
  }
}
    `;
export const GetAppHasDevClientBuildsDocument = gql`
    query getAppHasDevClientBuilds($appId: String!) {
  app {
    byId(appId: $appId) {
      id
      name
      hasDevClientBuilds: buildsPaginated(first: 1, filter: {developmentClient: true}) {
        edges {
          node {
            __typename
            id
            ... on Build {
              appIdentifier
            }
          }
        }
      }
    }
  }
}
    `;
export const GetRemoteSimulatorAccountsDocument = gql`
    query getRemoteSimulatorAccounts {
  meUserActor {
    id
    accounts {
      id
      name
      subscription {
        planId
      }
    }
  }
}
    `;
export const GetAccountDeviceRunSessionsDocument = gql`
    query getAccountDeviceRunSessions($accountId: String!, $after: String) {
  account {
    byId(accountId: $accountId) {
      id
      deviceRunSessionsPaginated(
        first: 50
        after: $after
        filter: {statuses: [NEW, QUEUED, STARTING, IN_PROGRESS]}
      ) {
        edges {
          node {
            id
            name
            status
            type
            platform
            deviceIdentifier
            startedAt
            createdAt
            initiatingActor {
              id
            }
            app {
              id
              slug
              ownerAccount {
                id
                name
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
    `;
export const GetDeviceRunSessionStatusDocument = gql`
    query getDeviceRunSessionStatus($deviceRunSessionId: ID!) {
  deviceRunSessions {
    byId(deviceRunSessionId: $deviceRunSessionId) {
      id
      status
    }
  }
}
    `;
export const GetDeviceRunSessionControllerDocument = gql`
    query getDeviceRunSessionController($deviceRunSessionId: ID!) {
  deviceRunSessions {
    byId(deviceRunSessionId: $deviceRunSessionId) {
      id
      status
      platform
      remoteConfig {
        __typename
        ... on AgentDeviceRunSessionRemoteConfig {
          agentDeviceRemoteSessionUrl
          agentDeviceRemoteSessionToken
        }
      }
    }
  }
}
    `;
export const CreateDeviceRunSessionDocument = gql`
    mutation createDeviceRunSession($deviceRunSessionInput: CreateDeviceRunSessionInput!) {
  deviceRunSession {
    createDeviceRunSession(deviceRunSessionInput: $deviceRunSessionInput) {
      id
      status
    }
  }
}
    `;
export const EnsureDeviceRunSessionStoppedDocument = gql`
    mutation ensureDeviceRunSessionStopped($deviceRunSessionId: ID!) {
  deviceRunSession {
    ensureDeviceRunSessionStopped(deviceRunSessionId: $deviceRunSessionId) {
      id
      status
    }
  }
}
    `;
export const GetRemoteSimulatorOptionsDocument = gql`
    query getRemoteSimulatorOptions($appId: String!) {
  deviceRunSessions {
    profiles {
      android {
        devices {
          identifier
          displayName
        }
      }
      ios {
        devices {
          identifier
          displayName
        }
      }
    }
  }
  expoGoBuild {
    supportedSdkVersions {
      sdkVersion
      isLatest
      isBeta
      isDeprecated
    }
  }
  app {
    byId(appId: $appId) {
      id
      iosBuilds: buildsPaginated(
        first: 50
        filter: {platforms: [IOS], simulator: true, statuses: [FINISHED], expired: false}
      ) {
        edges {
          node {
            __typename
            id
            ...RemoteSimulatorBuild
          }
        }
      }
      androidBuilds: buildsPaginated(
        first: 50
        filter: {platforms: [ANDROID], statuses: [FINISHED], expired: false}
      ) {
        edges {
          node {
            __typename
            id
            ...RemoteSimulatorBuild
          }
        }
      }
    }
  }
}
    ${RemoteSimulatorBuildFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    getAppBuildForUpdate(variables: GetAppBuildForUpdateQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetAppBuildForUpdateQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetAppBuildForUpdateQuery>(GetAppBuildForUpdateDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getAppBuildForUpdate', 'query', variables);
    },
    getAppHasDevClientBuilds(variables: GetAppHasDevClientBuildsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetAppHasDevClientBuildsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetAppHasDevClientBuildsQuery>(GetAppHasDevClientBuildsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getAppHasDevClientBuilds', 'query', variables);
    },
    getRemoteSimulatorAccounts(variables?: GetRemoteSimulatorAccountsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetRemoteSimulatorAccountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetRemoteSimulatorAccountsQuery>(GetRemoteSimulatorAccountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getRemoteSimulatorAccounts', 'query', variables);
    },
    getAccountDeviceRunSessions(variables: GetAccountDeviceRunSessionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetAccountDeviceRunSessionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetAccountDeviceRunSessionsQuery>(GetAccountDeviceRunSessionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getAccountDeviceRunSessions', 'query', variables);
    },
    getDeviceRunSessionStatus(variables: GetDeviceRunSessionStatusQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetDeviceRunSessionStatusQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetDeviceRunSessionStatusQuery>(GetDeviceRunSessionStatusDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getDeviceRunSessionStatus', 'query', variables);
    },
    getDeviceRunSessionController(variables: GetDeviceRunSessionControllerQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetDeviceRunSessionControllerQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetDeviceRunSessionControllerQuery>(GetDeviceRunSessionControllerDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getDeviceRunSessionController', 'query', variables);
    },
    createDeviceRunSession(variables: CreateDeviceRunSessionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CreateDeviceRunSessionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateDeviceRunSessionMutation>(CreateDeviceRunSessionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'createDeviceRunSession', 'mutation', variables);
    },
    ensureDeviceRunSessionStopped(variables: EnsureDeviceRunSessionStoppedMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<EnsureDeviceRunSessionStoppedMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<EnsureDeviceRunSessionStoppedMutation>(EnsureDeviceRunSessionStoppedDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'ensureDeviceRunSessionStopped', 'mutation', variables);
    },
    getRemoteSimulatorOptions(variables: GetRemoteSimulatorOptionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetRemoteSimulatorOptionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetRemoteSimulatorOptionsQuery>(GetRemoteSimulatorOptionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getRemoteSimulatorOptions', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;