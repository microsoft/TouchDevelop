/*!
* Labs.js JavaScript API for Office Mix
* Version: 1.0.4 * Copyright (c) Microsoft Corporation.  All rights reserved.
* Your use of this file is governed by the Microsoft Services Agreement http://go.microsoft.com/fwlink/?LinkId=266419.
*/
declare module Labs.Core {
  /**
  * Definition of a lab action. An action represents an interaction a user has taken with the lab.
  */
  interface IAction {
    /**
    * The type of action taken.
    */
    type: string;
    /**
    * The options sent with the action
    */
    options: Core.IActionOptions;
    /**
    * The result of the action
    */
    result: Core.IActionResult;
    /**
    * The time at which the action was completed. In milliseconds elapsed since 1 January 1970 00:00:00 UTC.
    */
    time: number;
  }
}
declare module Labs.Core {
  /**
  * The results of taking an action. Depending on the type of action these will either be set by the server side
  * or provided by the client when taking the action.
  */
  interface IActionResult {
  }
}
declare module Labs.Core {
  /**
  * Base class for instances of a lab component. An instance is an instantiation of a component for a user. It contains
  * a translated view of the component for a particular run of the lab. This view may exclude hidden information (answers, hints, etc...)
  * and also contains IDs to identify the various instances.
  */
  interface IComponentInstance extends Core.ILabObject, Core.IUserData {
    /**
    * The ID of the component this instance is associated with
    */
    componentId: string;
    /**
    * The name of the component
    */
    name: string;
    /**
    * value property map associated with the component
    */
    values: {
      [type: string]: Core.IValueInstance[];
    };
  }
}
declare module Labs.Core {
  /**
  * Information about the lab configuration.
  */
  interface IConfigurationInfo {
    /**
    * The version of the host the lab configuration was created with.
    */
    hostVersion: Core.IVersion;
  }
}
declare module Labs.Core {
  /**
  * Response information coming from a connection call
  */
  interface IConnectionResponse {
    /**
    * Initialization information or null if the app has not yet been initialized
    */
    initializationInfo: Core.IConfigurationInfo;
    /**
    * The current mode the lab is running in
    */
    mode: Core.LabMode;
    /**
    * Version information for server side
    */
    hostVersion: Core.IVersion;
    /**
    * Information about the user
    */
    userInfo: Core.IUserInfo;
  }
}
declare module Labs.Core {
  /**
  * Options passed as part of a get action
  */
  interface IGetActionOptions {
  }
}
declare module Labs.Core {
  /**
  * Options passed as part of a lab create.
  */
  interface ILabCreationOptions {
  }
}
declare module Labs.Core {
  /**
  * Version information about the lab host
  */
  interface ILabHostVersionInfo {
    /**
    * The API version of the host
    */
    version: Core.IVersion;
  }
}
declare module Labs.Core {
  /**
  * Definition of lab action options. These are the options passed when performing a given action.
  */
  interface IActionOptions {
  }
}
declare module Labs.Core {
  /**
  * Base interface for messages sent between the client and the host.
  */
  interface IMessage {
  }
}
declare module Labs.Core {
  /**
  * Base interface for responses to messages sent to the host.
  */
  interface IMessageResponse {
  }
}
declare module Labs.Core {
  /**
  * User information
  */
  interface IUserInfo {
    /**
    * Unique identifier for the given lab user
    */
    id: string;
    /**
    * Permissions the user has access to
    */
    permissions: string[];
  }
}
declare module Labs.Core {
  /**
  * An intance of an IValue
  */
  interface IValueInstance {
    /**
    * ID for the value this instance represents
    */
    valueId: string;
    /**
    * Flag indicating whether or not this value is considered a hint
    */
    isHint: boolean;
    /**
    * Flag indicating whether or not the instance information contains the value.
    */
    hasValue: boolean;
    /**
    * The value. May or may not be set depending on if it has been hidden.
    */
    value?: any;
  }
}
declare module Labs.Core {
  /**
  * Version information
  */
  interface IVersion {
    /**
    * Major version
    */
    major: number;
    /**
    * Minor version
    */
    minor: number;
  }
}
declare module Labs.Core {
  /**
  * Custom analytics configuration information. Allows the develper to specify which iframe to load
  * in order to display custom analytics for a user's run of a lab.
  */
  interface IAnalyticsConfiguration {
  }
}
declare module Labs.Core {
  /**
  * Completion status for the lab. Passed when completing the lab to indicate the result of the interaction.
  */
  interface ICompletionStatus {
  }
}
declare module Labs.Core {
  /**
  * Interface for Labs.js callback methods
  */
  interface ILabCallback<T> {
    /**
    * Callback signature
    *
    * @param { err } If an error has occurred this will be non-null
    * @param { data } The data returned with the callback
    */
    (err: any, data: T): void;
  }
}
declare module Labs.Core {
  /**
  * A lab object contains a type field which indicates what type of object it is
  */
  interface ILabObject {
    /**
    * The type name for the object
    */
    type: string;
  }
}
declare module Labs.Core {
  /**
  * Timeline configuration options. Allows the lab developer to specify a set of timeline configuration options.
  */
  interface ITimelineConfiguration {
    /**
    * The duration of the lab in seconds
    */
    duration: number;
    /**
    * A list of timeline capabilities the lab supports. i.e. play, pause, seek, fast forward...
    */
    capabilities: string[];
  }
}
declare module Labs.Core {
  /**
  * Base interface to represent custom user data stored on an object
  */
  interface IUserData {
    /**
    * An optional data field stored on the object for custom fields.
    */
    data?: any;
  }
}
declare module Labs.Core {
  /**
  * Base class for values stored with a lab
  */
  interface IValue {
    /**
    * Flag indicating whether or not this value is considered a hint
    */
    isHint: boolean;
    /**
    * The value
    */
    value: any;
  }
}
declare module Labs.Core {
  /**
  * Lab configuration data structure
  */
  interface IConfiguration extends Core.IUserData {
    /**
    * The version of the application associated with this configuration
    */
    appVersion: Core.IVersion;
    /**
    * The components of the lab
    */
    components: Core.IComponent[];
    /**
    * The name of the lab
    */
    name: string;
    /**
    * Lab timeline configuration
    */
    timeline: Core.ITimelineConfiguration;
    /**
    * Lab analytics configuration
    */
    analytics: Core.IAnalyticsConfiguration;
  }
}
declare module Labs.Core {
  /**
  * Base class for instances of a lab configuration. An instance is an instantiation of a configuration for a user. It contains
  * a translated view of the configuration for a particular run of the lab. This view may exclude hidden information (answers, hints, etc...)
  * and also contains IDs to identify the various instances.
  */
  interface IConfigurationInstance extends Core.IUserData {
    /**
    * The version of the application associated with this configuration
    */
    appVersion: Core.IVersion;
    /**
    * The components of the lab
    */
    components: Core.IComponentInstance[];
    /**
    * The name of the lab
    */
    name: string;
    /**
    * Lab timeline configuration
    */
    timeline: Core.ITimelineConfiguration;
  }
}
declare module Labs.Core {
  /**
  * Base class for components of a lab.
  */
  interface IComponent extends Core.ILabObject, Core.IUserData {
    /**
    * The name of the component
    */
    name: string;
    /**
    * value property map associated with the component
    */
    values: {
      [type: string]: Core.IValue[];
    };
  }
}
declare module Labs.Core {
  /**
  * The current mode of the lab. Whether in edit mode or view mode. Edit is when configuring the lab and view
  * is when taking the lab.
  */
  enum LabMode {
    /**
    * The lab is in edit mode. Meaning the user is configuring it
    */
    Edit,
    /**
    * The lab is in view mode. Meaning the user is taking it
    */
    View,
  }
}
declare module Labs.Core {
  /**
  * The ILabHost interfaces provides an abstraction for connecting Labs.js to the host
  */
  interface ILabHost {
    /**
    * Retrieves the versions supported by this lab host.
    */
    getSupportedVersions(): Core.ILabHostVersionInfo[];
    /**
    * Initializes communication with the host
    *
    * @param { versions } The list of versions that the client of the host can make use of
    * @param { callback } Callback for when the connection is complete
    */
    connect(versions: Core.ILabHostVersionInfo[], callback: Core.ILabCallback<Core.IConnectionResponse>);
    /**
    * Stops communication with the host
    *
    * @param { completionStatus } The final status of the lab at the time of the disconnect
    * @param { callback } Callback fired when the disconnect completes
    */
    disconnect(callback: Core.ILabCallback<void>);
    /**
    * Adds an event handler for dealing with messages coming from the host. The resolved promsie
    * will be returned back to the host
    *
    * @param { handler } The event handler
    */
    on(handler: (string: any, any: any) => void);
    /**
    * Sends a message to the host
    *
    * @param { type } The type of message being sent
    * @param { options } The options for that message
    * @param { callback } Callback invoked once the message has been received
    */
    sendMessage(type: string, options: Core.IMessage, callback: Core.ILabCallback<Core.IMessageResponse>);
    /**
    * Creates the lab. Stores the host information and sets aside space for storing the configuration and other elements.
    *
    * @param { options } Options passed as part of creation
    */
    create(options: Core.ILabCreationOptions, callback: Core.ILabCallback<void>);
    /**
    * Gets the current lab configuration from the host
    *
    * @param { callback } Callback method for retrieving configuration information
    */
    getConfiguration(callback: Core.ILabCallback<Core.IConfiguration>);
    /**
    * Sets a new lab configuration on the host
    *
    * @param { configuration } The lab configuration to set
    * @param { callback } Callback fired when the configuration is set
    */
    setConfiguration(configuration: Core.IConfiguration, callback: Core.ILabCallback<void>);
    /**
    * Retrieves the instance configuration for the lab
    *
    * @param { callback } Callback that will be called when the configuration instance is retrieved
    */
    getConfigurationInstance(callback: Core.ILabCallback<Core.IConfigurationInstance>);
    /**
    * Gets the current state of the lab for the user
    *
    * @param { completionStatus } Callback that will return the current lab state
    */
    getState(callback: Core.ILabCallback<any>);
    /**
    * Sets the state of the lab for the user
    *
    * @param { state } The lab state
    * @param { callback } Callback that will be invoked when the state has been set
    */
    setState(state: any, callback: Core.ILabCallback<void>);
    /**
    * Takes an attempt action
    *
    * @param { type } The type of action
    * @param { options } The options provided with the action
    * @param { callback } Callback which returns the final executed action
    */
    takeAction(type: string, options: Core.IActionOptions, callback: Core.ILabCallback<Core.IAction>);
    /**
    * Takes an action that has already been completed
    *
    * @param { type } The type of action
    * @param { options } The options provided with the action
    * @param { result } The result of the action
    * @param { callback } Callback which returns the final executed action
    */
    takeAction(type: string, options: Core.IActionOptions, result: Core.IActionResult, callback: Core.ILabCallback<Core.IAction>);
    /**
    * Retrieves the actions for a given attempt
    *
    * @param { type } The type of get action
    * @param { options } The options provided with the get action
    * @param { callback } Callback which returns the list of completed actions
    */
    getActions(type: string, options: Core.IGetActionOptions, callback: Core.ILabCallback<Core.IAction[]>);
  }
}
declare module Labs.Core {
  /**
  * Static class representing the permissions allowed for the given user of the lab
  */
  class Permissions {
    /**
    * Ability to edit the lab
    */
    static Edit: string;
    /**
    * Ability to take the lab
    */
    static Take: string;
  }
}


declare module Labs.Core.Actions {
  /**
  * Closes the component and indicates there will be no future actions against it.
  */
  var CloseComponentAction: string;
  /**
  * Closes a component and indicates there will be no more actions against it.
  */
  interface ICloseComponentOptions extends Core.IActionOptions {
    /**
    * The component to close.
    */
    componentId: string;
  }
}
declare module Labs.Core.Actions {
  /**
  * Action to create a new attempt
  */
  var CreateAttemptAction: string;
  /**
  * Creates a new attempt for the given component.
  */
  interface ICreateAttemptOptions extends Core.IActionOptions {
    /**
    * The component the attempt is associated with
    */
    componentId: string;
  }
}
declare module Labs.Core.Actions {
  /**
  * The result of creating an attempt for the given component.
  */
  interface ICreateAttemptResult extends Core.IActionResult {
    /**
    * The ID of the created attempt
    */
    attemptId: string;
  }
}
declare module Labs.Core.Actions {
  /**
  * Action to create a new component
  */
  var CreateComponentAction: string;
  /**
  * Creates a new component
  */
  interface ICreateComponentOptions extends Core.IActionOptions {
    /**
    * The component invoking the create component action.
    */
    componentId: string;
    /**
    * The component to create
    */
    component: Core.IComponent;
    /**
    * An (optional) field used to correlate this component across all instances of a lab.
    * Allows the hosting system to identify different attempts at the same component.
    */
    correlationId?: string;
  }
}
declare module Labs.Core.Actions {
  /**
  * The result of creating a new component.
  */
  interface ICreateComponentResult extends Core.IActionResult {
    /**
    * The created component instance
    */
    componentInstance: Core.IComponentInstance;
  }
}
declare module Labs.Core.Actions {
  /**
  * The result of a get value action
  */
  interface IGetValueResult extends Core.IActionResult {
    /**
    * The retrieved value
    */
    value: any;
  }
}
declare module Labs.Core.Actions {
  /**
  * The result of submitting an answer for an attempt
  */
  interface ISubmitAnswerResult extends Core.IActionResult {
    /**
    * An ID associated with the submission. Will be filled in by the server.
    */
    submissionId: string;
    /**
    * Whether the attempt is complete due to this submission
    */
    complete: boolean;
    /**
    * Scoring information associated with the submission
    */
    score: any;
  }
}
declare module Labs.Core.Actions {
  /**
  * Attempt timeout action
  */
  var AttemptTimeoutAction: string;
  /**
  * Options for the attempt timeout action
  */
  interface IAttemptTimeoutOptions extends Core.IActionOptions {
    /**
    * The ID of the attempt that timed out
    */
    attemptId: string;
  }
}
declare module Labs.Core.Actions {
  /**
  * Action to retrieve a value associated with an attempt.
  */
  var GetValueAction: string;
  interface IGetValueOptions extends Core.IActionOptions {
    /**
    * The component the get value is associated with
    */
    componentId: string;
    /**
    * The attempt to get the value for
    */
    attemptId: string;
    /**
    * The ID of the value to receive
    */
    valueId: string;
  }
}
declare module Labs.Core.Actions {
  /**
  * Resume attempt action. Used to indicate the user is resuming work on a given attempt.
  */
  var ResumeAttemptAction: string;
  /**
  * Options associated with a resume attempt
  */
  interface IResumeAttemptOptions extends Core.IActionOptions {
    /**
    * The component the attempt is associated with
    */
    componentId: string;
    /**
    * The attempt that is being resumed
    */
    attemptId: string;
  }
}
declare module Labs.Core.Actions {
  /**
  * Action to submit an answer for a given attempt
  */
  var SubmitAnswerAction: string;
  /**
  * Options for the submit answer action
  */
  interface ISubmitAnswerOptions extends Core.IActionOptions {
    /**
    * The component the submission is associated with
    */
    componentId: string;
    /**
    * The attempt the submission is associated with
    */
    attemptId: string;
    /**
    * The answer being submitted
    */
    answer: any;
  }
}


declare module Labs.Core.GetActions {
  /**
  * Gets actions associated with a given component.
  */
  var GetComponentActions: string;
  /**
  * Options associated with a get component actions
  */
  interface IGetComponentActionsOptions extends Core.IGetActionOptions {
    /**
    * The component being searched for
    */
    componentId: string;
    /**
    * The type of action being searched for
    */
    action: string;
  }
}
declare module Labs.Core.GetActions {
  /**
  * Get attempt get action. Retrieves all actions associated with a given attempt.
  */
  var GetAttempt: string;
  /**
  * Options associated with a get attempt get action.
  */
  interface IGetAttemptOptions extends Core.IGetActionOptions {
    /**
    * The attempt ID to retrieve all the actions for
    */
    attemptId: string;
  }
}




declare module Labs.Core {
  /**
  * Interface for EventManager callbacks
  */
  interface IEventCallback {
    (data: any): void;
  }
}
declare module Labs {
  var TimelineNextMessageType: string;
  interface ITimelineNextMessage extends Labs.Core.IMessage {
    status: Labs.Core.ICompletionStatus;
  }
}
declare module Labs {
  /**
  * Base class for components instances
  */
  class ComponentInstanceBase {
    /**
    * The ID of the component
    */
    public _id: string;
    /**
    * The LabsInternal object for use by the component instance
    */
    public _labs: Labs.LabsInternal;
    constructor();
    /**
    * Attaches a LabsInternal to this component instance
    *
    * @param { id } The ID of the component
    * @param { labs } The LabsInternal object for use by the instance
    */
    public attach(id: string, labs: Labs.LabsInternal): void;
  }
}
declare module Labs {
  /**
  * Class representing a component instance. An instance is an instantiation of a component for a user. It contains
  * a translated view of the component for a particular run of the lab.
  */
  class ComponentInstance<T> extends Labs.ComponentInstanceBase {
    /**
    * Constructs a new ComponentInstance.
    */
    constructor();
    /**
    * Begins a new attempt at the component
    *
    * @param { callback } Callback fired when the attempt has been created
    */
    public createAttempt(callback: Labs.Core.ILabCallback<T>): void;
    /**
    * Retrieves all attempts associated with the given component
    *
    * @param { callback } Callback fired once the attempts have been retrieved
    */
    public getAttempts(callback: Labs.Core.ILabCallback<T[]>): void;
    /**
    * Retrieves the default create attempt options. Can be overriden by derived classes.
    */
    public getCreateAttemptOptions(): Labs.Core.Actions.ICreateAttemptOptions;
    /**
    * method to built an attempt from the given action. Should be implemented by derived classes.
    *
    * @param { createAttemptResult } The create attempt action for the attempt
    */
    public buildAttempt(createAttemptResult: Labs.Core.IAction): T;
  }
}
declare module Labs {
  /**
  * Enumeration of the connection states
  */
  enum ConnectionState {
    /**
    * Disconnected
    */
    Disconnected,
    /**
    * In the process of connecting
    */
    Connecting,
    /**
    * Connected
    */
    Connected,
  }
}
declare module Labs {
  /**
  * Helper class to manage a set of event handlers
  */
  class EventManager {
    private _handlers;
    private getHandler(event);
    /**
    * Adds a new event handler for the given event
    *
    * @param { event } The event to add a handler for
    * @param { handler } The event handler to add
    */
    public add(event: string, handler: Labs.Core.IEventCallback): void;
    /**
    * Removes an event handler for the given event
    *
    * @param { event } The event to remove a handler for
    * @param { handler } The event handler to remove
    */
    public remove(event: string, handler: Labs.Core.IEventCallback): void;
    /**
    * Fires the given event
    *
    * @param { event } The event to fire
    * @param { data } Data associated with the event
    */
    public fire(event: string, data: any): void;
  }
}
declare module Labs {
  /**
  * The LabEditor allows for the editing of the given lab. This includes getting and setting
  * the entire configuration associated with the lab.
  */
  class LabEditor {
    private _labsInternal;
    private _doneCallback;
    /**
    * Constructs a new LabEditor
    *
    * @param { labsInternal } LabsInternal to use with the editor
    * @param { doneCallback } Callback to invoke when the editor is finished
    */
    constructor(labsInternal: Labs.LabsInternal, doneCallback: Function);
    /**
    * Creates a new lab. This prepares the lab storage and saves the host version
    *
    * @param { labsInternal } LabsInternal to use with the editor
    * @param { doneCallback } Callback to invoke when the editor is finished
    * @param { callback } Callback fired once the LabEditor has been created
    */
    static Create(labsInternal: Labs.LabsInternal, doneCallback: Function, callback: Labs.Core.ILabCallback<LabEditor>): void;
    /**
    * Gets the current lab configuration
    *
    * @param { callback } Callback fired once the configuration has been retrieved
    */
    public getConfiguration(callback: Labs.Core.ILabCallback<Labs.Core.IConfiguration>): void;
    /**
    * Sets a new lab configuration
    *
    * @param { configuration } The configuration to set
    * @param { callback } Callback fired once the configuration has been set
    */
    public setConfiguration(configuration: Labs.Core.IConfiguration, callback: Labs.Core.ILabCallback<void>): void;
    /**
    * Indicates that the user is done editing the lab.
    *
    * @param { callback } Callback fired once the lab editor has finished
    */
    public done(callback: Labs.Core.ILabCallback<void>): void;
  }
}
declare module Labs {
  /**
  * A LabInstance is an instance of the configured lab for the current user. It is used to
  * record and retrieve per user lab data.
  */
  class LabInstance {
    private _labsInternal;
    private _doneCallback;
    public data: any;
    /**
    * The components that make up the lab instance
    */
    public components: Labs.ComponentInstanceBase[];
    /**
    * Constructs a new LabInstance
    *
    * @param { labsInternal } The LabsInternal to use with the instance
    * @param { components } The components of the lab instance
    * @param { doneCallback } Callback to invoke once the user is done taking the instance
    * @param { data } Custom data attached to the lab
    */
    constructor(labsInternal: Labs.LabsInternal, components: Labs.ComponentInstanceBase[], doneCallback: Function, data: any);
    /**
    * Creates a new LabInstance
    *
    * @param { labsInternal } The LabsInternal to use with the instance
    * @param { doneCallback } Callback to invoke once the user is done taking the instance
    * @param { callback } Callback that fires once the LabInstance has been created
    */
    static Create(labsInternal: Labs.LabsInternal, doneCallback: Function, callback: Labs.Core.ILabCallback<LabInstance>): void;
    /**
    * Gets the current state of the lab for the user
    *
    * @param { callback } Callback that fires with the lab state
    */
    public getState(callback: Labs.Core.ILabCallback<any>): void;
    /**
    * Sets the state of the lab for the user
    *
    * @param { state } The state to set
    * @param { callback } Callback that fires once the state is set
    */
    public setState(state: any, callback: Labs.Core.ILabCallback<void>): void;
    /**
    * Indicates that the user is done taking the lab.
    *
    * @param { callback } Callback fired once the lab instance has finished
    */
    public done(callback: Labs.Core.ILabCallback<void>): void;
  }
}
declare module Labs {
  /**
  * Method to use to construct a default ILabHost
  */
  var DefaultHostBuilder: () => Core.ILabHost;
  /**
  * Initializes a connection with the host.
  *
  * @param { labHost } The (optional) ILabHost to use. If not specified will be constructed with the DefaultHostBuilder
  * @param { callback } Callback to fire once the connection has been established
  */
  function connect(callback: Core.ILabCallback<Core.IConnectionResponse>);
  function connect(labHost: Core.ILabHost, callback: Core.ILabCallback<Core.IConnectionResponse>);
  /**
  * Returns whether or not the labs are connected to the host.
  */
  function isConnected(): boolean;
  /**
  * Retrieves the information associated with a connection
  */
  function getConnectionInfo(): Core.IConnectionResponse;
  /**
  * Disconnects from the host.
  *
  * @param { completionStatus } The final result of the lab interaction
  */
  function disconnect(): void;
  /**
  * Opens the lab for editing. When in edit mode the configuration can be specified. A lab cannot be edited while it
  * is being taken.
  *
  * @param { callback } Callback fired once the LabEditor is created
  */
  function editLab(callback: Core.ILabCallback<LabEditor>): void;
  /**
  * Takes the given lab. This allows results to be sent for the lab. A lab cannot be taken while it is being edited.
  *
  * @param { callback } Callback fired once the LabInstance is created
  */
  function takeLab(callback: Core.ILabCallback<LabInstance>): void;
  /**
  * Adds a new event handler for the given event
  *
  * @param { event } The event to add a handler for
  * @param { handler } The event handler to add
  */
  function on(event: string, handler: Core.IEventCallback): void;
  /**
  * Removes an event handler for the given event
  *
  * @param { event } The event to remove a handler for
  * @param { handler } The event handler to remove
  */
  function off(event: string, handler: Core.IEventCallback): void;
  /**
  * Retrieves the Timeline object that can be used to control the host's player control.
  */
  function getTimeline(): Timeline;
  /**
  * Registers a function to deserialize the given type. Should be used by component authors only.
  *
  * @param { type } The type to deserialize
  * @param { deserialize } The deserialization function
  */
  function registerDeserializer(type: string, deserialize: (json: Core.ILabObject) => any): void;
  /**
  * Deserializes the given json object into an object. Should be used by component authors only.
  *
  * @param { json } The ILabObject to deserialize
  */
  function deserialize(json: Core.ILabObject): any;
}
declare module Labs {
  /**
  * Class used to interface with the underlying ILabsHost interface.
  */
  class LabsInternal {
    /**
    * Current state of the LabsInternal
    */
    private _state;
    /**
    * The driver to send our commands to
    */
    private _labHost;
    /**
    * Helper class to manage events in the system
    */
    private _eventManager;
    /**
    * The cached configuration and state for the lab
    */
    private _configuration;
    /**
    * The version of the host this LabsInternal is making use of
    */
    private _hostVersion;
    /**
    * Start out queueing pending messages until we are notified to invoke them
    */
    private _queuePendingMessages;
    /**
    * Pending messages to invoke from the EventManager
    */
    private _pendingMessages;
    /**
    * Constructs a new LabsInternal
    *
    * @param { labHost } The ILabHost to make use of
    */
    constructor(labHost: Labs.Core.ILabHost);
    /**
    * Connect to the host
    *
    * @param { callback } Callback that will return the IConnectionResponse when connected
    */
    public connect(callback: Labs.Core.ILabCallback<Labs.Core.IConnectionResponse>): void;
    /**
    * Fires all pending messages
    */
    public firePendingMessages(): void;
    /**
    * Creates a new lab
    *
    * @param { callback } Callback fired once the create operation completes
    */
    public create(callback: Labs.Core.ILabCallback<void>): void;
    /**
    * Terminates the LabsInternal class and halts the connection.
    */
    public dispose(): void;
    /**
    * Adds an event handler for the given event
    *
    * @param { event } The event to listen for
    * @param { handler } Handler fired for the given event
    */
    public on(event: string, handler: Labs.Core.IEventCallback): void;
    /**
    * Sends a message to the host
    *
    * @param { type } The type of message being sent
    * @param { options } The options for that message
    * @param { callback } Callback invoked once the message has been received
    */
    public sendMessage(type: string, options: Labs.Core.IMessage, callback: Labs.Core.ILabCallback<Labs.Core.IMessageResponse>): void;
    /**
    * Removes an event handler for the given event
    *
    * @param { event } The event whose handler should be removed
    * @param { handler } Handler to remove
    */
    public off(event: string, handler: Labs.Core.IEventCallback): void;
    /**
    * Gets the current state of the lab for the user
    *
    * @param { callback } Callback that fires when the state is retrieved
    */
    public getState(callback: Labs.Core.ILabCallback<any>): void;
    /**
    * Sets the state of the lab for the user
    *
    * @param { state } The state to set
    * @param { callback } Callback fired once the state has been set
    */
    public setState(state: any, callback: Labs.Core.ILabCallback<void>): void;
    /**
    * Gets the current lab configuration
    *
    * @param { callback } Callback that fires when the configuration is retrieved
    */
    public getConfiguration(callback: Labs.Core.ILabCallback<Labs.Core.IConfiguration>): void;
    /**
    * Sets a new lab configuration
    *
    * @param { configuration } The lab configuration to set
    * @param { callback } Callback that fires once the configuration has been set
    */
    public setConfiguration(configuration: Labs.Core.IConfiguration, callback: Labs.Core.ILabCallback<void>): void;
    /**
    * Retrieves the configuration instance for the lab.
    *
    * @param { callback } Callback that fires when the configuration instance has been retrieved
    */
    public getConfigurationInstance(callback: Labs.Core.ILabCallback<Labs.Core.IConfigurationInstance>): void;
    /**
    * Takes an action
    *
    * @param { type } The type of action to take
    * @param { options } The options associated with the action
    * @param { result } The result of the action
    * @param { callback } Callback that fires once the action has completed
    */
    public takeAction(type: string, options: Labs.Core.IActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
    public takeAction(type: string, options: Labs.Core.IActionOptions, result: Labs.Core.IActionResult, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
    /**
    * Retrieves actions
    *
    * @param { type } The type of get to perform
    * @param { options } The options associated with the get
    * @param { callback } Callback that fires with the completed actions
    */
    public getActions(type: string, options: Labs.Core.IGetActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction[]>): void;
    /**
    * Checks whether or not the LabsInternal is initialized
    */
    private checkIsInitialized();
  }
}
declare module Labs {
  /**
  * Provides access to the labs.js timeline
  */
  class Timeline {
    private _labsInternal;
    constructor(labsInternal: Labs.LabsInternal);
    /**
    * Used to indicate that the timeline should advance to the next slide.
    */
    public next(completionStatus: Labs.Core.ICompletionStatus, callback: Labs.Core.ILabCallback<void>): void;
  }
}
declare module Labs {
  /**
  * A ValueHolder is responsible for holding a value that when requested is tracked by labs.js.
  * This value may be stored locally or stored on the server.
  */
  class ValueHolder<T> {
    /**
    * The component the value is associated with
    */
    private _componentId;
    /**
    * Attempt the value is associated with
    */
    private _attemptId;
    /**
    * Underlying labs device
    */
    private _labs;
    /**
    * Whether or not the value is a hint
    */
    public isHint: boolean;
    /**
    * Whether or not the value has been requested.
    */
    public hasBeenRequested: boolean;
    /**
    * Whether or not the value holder currently has the value.
    */
    public hasValue: boolean;
    /**
    * The value held by the holder.
    */
    public value: T;
    /**
    * The ID for the value
    */
    public id: string;
    /**
    * Constructs a new ValueHolder
    *
    * @param { componentId } The component the value is associated with
    * @param { attemptId } The attempt the value is associated with
    * @param { id } The id of the value
    * @param { labs } The labs device that can be used to request the value
    * @param { isHint } Whether or not the value is a hint
    * @param { hasBeenRequested } Whether or not the value has already been requested
    * @param { hasValue } Whether or not the value is available
    * @param { value } If hasValue is true this is the value, otherwise is optional
    */
    constructor(componentId: string, attemptId: string, id: string, labs: Labs.LabsInternal, isHint: boolean, hasBeenRequested: boolean, hasValue: boolean, value?: T);
    /**
    * Retrieves the given value
    *
    * @param { callback } Callback that returns the given value
    */
    public getValue(callback: Labs.Core.ILabCallback<T>): void;
    /**
    * Internal method used to actually provide a value to the value holder
    *
    * @param { value } The value to set for the holder
    */
    public provideValue(value: T): void;
  }
}


declare module Labs.Components {
  /**
  * Base class for attempts
  */
  class ComponentAttempt {
    public _componentId: string;
    public _id: string;
    public _labs: Labs.LabsInternal;
    public _resumed: boolean;
    public _state: Labs.ProblemState;
    public _values: {
      [type: string]: Labs.ValueHolder<any>[];
    };
    /**
    * Constructs a new ComponentAttempt.
    *
    * @param { labs } The LabsInternal to use with the attempt
    * @param { attemptId } The ID associated with the attempt
    * @param { values } The values associated with the attempt
    */
    constructor(labs: Labs.LabsInternal, componentId: string, attemptId: string, values: {
      [type: string]: Labs.Core.IValueInstance[];
      });
      /**
      * Verifies that the attempt has been resumed
      */
      public verifyResumed(): void;
      /**
      * Returns whether or not the app has been resumed
      */
      public isResumed(): boolean;
      /**
      * Used to indicate that the lab has resumed progress on the given attempt. Loads in existing data as part of this process. An attempt
      * must be resumed before it can be used.
      *
      * @param { callback } Callback fired once the attempt is resumed
      */
      public resume(callback: Labs.Core.ILabCallback<void>): void;
      /**
      * Helper method to send the resume action to the host
      */
      private sendResumeAction(callback);
      /**
      * Runs over the retrieved actions for the attempt and populates the state of the lab
      */
      private resumeCore(actions);
      /**
      * Retrieves the state of the lab
      */
      public getState(): Labs.ProblemState;
      public processAction(action: Labs.Core.IAction): void;
      /**
      * Retrieves the cached values associated with the attempt
      *
      * @param { key } The key to lookup in the value map
      */
      public getValues(key: string): Labs.ValueHolder<any>[];
      /**
      * Makes use of a value in the value array
      */
      private useValue(completedSubmission);
    }
  }
  declare module Labs.Components {
    /**
    * A class representing an attempt at an activity component
    */
    class ActivityComponentAttempt extends Components.ComponentAttempt {
      constructor(labs: Labs.LabsInternal, componentId: string, attemptId: string, values: {
        [type: string]: Labs.Core.IValueInstance[];
        });
        /**
        * Called to indicate that the activity has completed
        *
        * @param { callback } Callback invoked once the activity has completed
        */
        public complete(callback: Labs.Core.ILabCallback<void>): void;
        /**
        * Runs over the retrieved actions for the attempt and populates the state of the lab
        */
        public processAction(action: Labs.Core.IAction): void;
      }
    }
    declare module Labs.Components {
      var ActivityComponentInstanceType: string;
      class ActivityComponentInstance extends Labs.ComponentInstance<Components.ActivityComponentAttempt> {
        /**
        * The underlying IActivityComponentInstance this class represents
        */
        public component: Components.IActivityComponentInstance;
        /**
        * Constructs a new ActivityComponentInstnace
        *
        * @param { component } The IActivityComponentInstance to create this class from
        */
        constructor(component: Components.IActivityComponentInstance);
        /**
        * Builds a new ActivityComponentAttempt. Implements abstract method defined on the base class.
        *
        * @param { createAttemptResult } The result from a create attempt action
        */
        public buildAttempt(createAttemptAction: Labs.Core.IAction): Components.ActivityComponentAttempt;
      }
    }
    declare module Labs.Components {
      /**
      * Answer to a choice component problem
      */
      class ChoiceComponentAnswer {
        /**
        * The answer value
        */
        public answer: any;
        /**
        * Constructs a new ChoiceComponentAnswer
        */
        constructor(answer: any);
      }
    }
    declare module Labs.Components {
      /**
      * A class representing an attempt at a choice component
      */
      class ChoiceComponentAttempt extends Components.ComponentAttempt {
        private _submissions;
        /**
        * Constructs a new ChoiceComponentAttempt.
        *
        * @param { labs } The LabsInternal to use with the attempt
        * @param { attemptId } The ID associated with the attempt
        * @param { values } The values associated with the attempt
        */
        constructor(labs: Labs.LabsInternal, componentId: string, attemptId: string, values: {
          [type: string]: Labs.Core.IValueInstance[];
          });
          /**
          * Used to mark that the lab has timed out
          *
          * @param { callback } Callback fired once the server has received the timeout message
          */
          public timeout(callback: Labs.Core.ILabCallback<void>): void;
          /**
          * Retrieves all of the submissions that have previously been submitted for the given attempt
          */
          public getSubmissions(): Components.ChoiceComponentSubmission[];
          /**
          * Submits a new answer that was graded by the lab and will not use the host to compute a grade.
          *
          * @param { answer } The answer for the attempt
          * @param { result } The result of the submission
          * @param { callback } Callback fired once the submission has been received
          */
          public submit(answer: Components.ChoiceComponentAnswer, result: Components.ChoiceComponentResult, callback: Labs.Core.ILabCallback<Components.ChoiceComponentSubmission>): void;
          public processAction(action: Labs.Core.IAction): void;
          /**
          * Helper method used to handle a returned submission from labs core
          */
          private storeSubmission(completedSubmission);
        }
      }
      declare module Labs.Components {
        /**
        * The name of the component instance. A choice component is a component that has multiple choice options and supports zero
        * or more responses. Optionally there is a correct list of choices.
        */
        var ChoiceComponentInstanceType: string;
        /**
        * Class representing a choice component instance
        */
        class ChoiceComponentInstance extends Labs.ComponentInstance<Components.ChoiceComponentAttempt> {
          /**
          * The underlying IChoiceComponentInstance this class represents
          */
          public component: Components.IChoiceComponentInstance;
          /**
          * Constructs a new ChoiceComponentInstance
          *
          * @param { component } The IChoiceComponentInstance to create this class from
          */
          constructor(component: Components.IChoiceComponentInstance);
          /**
          * Builds a new ChoiceComponentAttempt. Implements abstract method defined on the base class.
          *
          * @param { createAttemptResult } The result from a create attempt action
          */
          public buildAttempt(createAttemptAction: Labs.Core.IAction): Components.ChoiceComponentAttempt;
        }
      }
      declare module Labs.Components {
        /**
        * The name of the component instance. A dynamic component is a component that allows for new components to be inserted within it.
        */
        var DynamicComponentInstanceType: string;
        /**
        * Class representing a dynamic component. A dynamic component is used to create, at runtime, new components.
        */
        class DynamicComponentInstance extends Labs.ComponentInstanceBase {
          public component: Components.IDynamicComponentInstance;
          /**
          * Constructs a new dynamic component instance from the provided definition
          */
          constructor(component: Components.IDynamicComponentInstance);
          /**
          * Retrieves all the components created by this dynamic component.
          */
          public getComponents(callback: Labs.Core.ILabCallback<Labs.ComponentInstanceBase[]>): void;
          /**
          * Creates a new component.
          */
          public createComponent(component: Labs.Core.IComponent, callback: Labs.Core.ILabCallback<Labs.ComponentInstanceBase>): void;
          private createComponentInstance(action);
          /**
          * Used to indicate that there will be no more submissions associated with this component
          */
          public close(callback: Labs.Core.ILabCallback<void>): void;
          /**
          * Returns whether or not the dynamic component is closed
          */
          public isClosed(callback: Labs.Core.ILabCallback<boolean>): void;
        }
      }
      declare module Labs.Components {
        /**
        * Type string for an ActivityComponent
        */
        var ActivityComponentType: string;
        /**
        * An activity component is simply an activity for the taker to experience. Examples are viewing a web page
        * or watching a video.
        */
        interface IActivityComponent extends Labs.Core.IComponent {
          /**
          * Whether or not the input component is secure. This is not yet implemented.
          */
          secure: boolean;
        }
      }
      declare module Labs.Components {
        interface IActivityComponentInstance extends Labs.Core.IComponentInstance {
        }
      }
      declare module Labs.Components {
        /**
        * A choice for a problem
        */
        interface IChoice {
          /**
          * Unique id to represent the choice
          */
          id: string;
          /**
          * Display string to use to represent the value
          * I think I should put this into the value type - have default ones show up - and then have custom values within
          */
          name: string;
          /**
          * The value of the choice
          */
          value: any;
        }
      }
      declare module Labs.Components {
        /**
        * Type string to use with this type of component
        */
        var ChoiceComponentType: string;
        /**
        * A choice problem is a problem type where the user is presented with a list of choices and then needs to select
        * an answer from them.
        */
        interface IChoiceComponent extends Labs.Core.IComponent {
          /**
          * The list of choices associated with the problem
          */
          choices: Components.IChoice[];
          /**
          * A time limit for the problem
          */
          timeLimit: number;
          /**
          * The maximum number of attempts allowed for the problem
          */
          maxAttempts: number;
          /**
          * The max score for the problem
          */
          maxScore: number;
          /**
          * Whether or not this problem has an answer
          */
          hasAnswer: boolean;
          /**
          * The answer. Either an array if multiple answers are supported or a single ID if only one answer is supported.
          */
          answer: any;
          /**
          * Whether or not the quiz is secure - meaning that secure fields are held from the user.
          * This is not yet implemented.
          */
          secure: boolean;
        }
      }
      declare module Labs.Components {
        /**
        * An instance of a choice component
        */
        interface IChoiceComponentInstance extends Labs.Core.IComponentInstance {
          /**
          * The list of choices associated with the problem
          */
          choices: Components.IChoice[];
          /**
          * A time limit for the problem
          */
          timeLimit: number;
          /**
          * The maximum number of attempts allowed for the problem
          */
          maxAttempts: number;
          /**
          * The max score for the problem
          */
          maxScore: number;
          /**
          * Whether or not this problem has an answer
          */
          hasAnswer: boolean;
          /**
          * The answer. Either an array if multiple answers are supported or a single ID if only one answe is supported.
          */
          answer: any;
          /**
          * Whether or not the quiz is secure - meaning that secure fields are held from the user
          */
          secure: boolean;
        }
      }
      declare module Labs.Components {
        var Infinite: number;
        /**
        * Type string for a dynamic component
        */
        var DynamicComponentType: string;
        /**
        * A dynamic component represents one that can generate other components at runtime.
        * This can be used for branching questions, dynamically generated ones, etc...
        */
        interface IDynamicComponent extends Labs.Core.IComponent {
          /**
          * An array containing the types of components this dynamic component may generate
          */
          generatedComponentTypes: string[];
          /**
          * The maximum number of components that will be generated by this DynamicComponent. Or Labs.Components.Infinite if
          * there is no cap.
          */
          maxComponents: number;
        }
      }
      declare module Labs.Components {
        /**
        * An instance of a dynamic component.
        */
        interface IDynamicComponentInstance extends Labs.Core.IComponentInstance {
          /**
          * An array containing the types of components this dynamic component may generate
          */
          generatedComponentTypes: string[];
          /**
          * The maximum number of components that will be generated by this DynamicComponent. Or Labs.Components.Infinite if
          * there is no cap.
          */
          maxComponents: number;
        }
      }
      declare module Labs.Components {
        /**
        * A hint in a lab
        */
        interface IHint extends Labs.Core.IValue {
          /**
          * Display value to use for the hint
          */
          name: string;
        }
      }
      declare module Labs.Components {
        /**
        * Type string to use with this type of component
        */
        var InputComponentType: string;
        /**
        * An input problem is one in which the user enters an input which is checked against a correct value.
        */
        interface IInputComponent extends Labs.Core.IComponent {
          /**
          * The max score for the input component
          */
          maxScore: number;
          /**
          * Time limit associated with the input problem
          */
          timeLimit: number;
          /**
          * Whether or not the component has an answer
          */
          hasAnswer: boolean;
          /**
          * The answer to the component (if it exists)
          */
          answer: any;
          /**
          * Whether or not the input component is secure. This is not yet implemented.
          */
          secure: boolean;
        }
      }
      declare module Labs.Components {
        /**
        * An input problem is one in which the user enters an input which is checked against a correct value.
        */
        interface IInputComponentInstance extends Labs.Core.IComponentInstance {
          /**
          * The max score for the input component
          */
          maxScore: number;
          /**
          * Time limit associated with the input problem
          */
          timeLimit: number;
          /**
          * The answer to the component
          */
          answer: any;
        }
      }
      declare module Labs.Components {
        /**
        * Answer to an input component problem
        */
        class InputComponentAnswer {
          /**
          * The answer value
          */
          public answer: any;
          /**
          * Constructs a new InputComponentAnswer
          */
          constructor(answer: any);
        }
      }
      declare module Labs.Components {
        /**
        * A class representing an attempt at an input component
        */
        class InputComponentAttempt extends Components.ComponentAttempt {
          private _submissions;
          constructor(labs: Labs.LabsInternal, componentId: string, attemptId: string, values: {
            [type: string]: Labs.Core.IValueInstance[];
            });
            /**
            * Runs over the retrieved actions for the attempt and populates the state of the lab
            */
            public processAction(action: Labs.Core.IAction): void;
            /**
            * Retrieves all of the submissions that have previously been submitted for the given attempt
            */
            public getSubmissions(): Components.InputComponentSubmission[];
            /**
            * Submits a new answer that was graded by the lab and will not use the host to compute a grade.
            *
            * @param { answer } The answer for the attempt
            * @param { result } The result of the submission
            * @param { callback } Callback fired once the submission has been received
            */
            public submit(answer: Components.InputComponentAnswer, result: Components.InputComponentResult, callback: Labs.Core.ILabCallback<Components.InputComponentSubmission>): void;
            /**
            * Helper method used to handle a returned submission from labs core
            */
            private storeSubmission(completedSubmission);
          }
        }
        declare module Labs.Components {
          /**
          * The name of the component instance. An input component is a component that allows free form
          * input from a user.
          */
          var InputComponentInstanceType: string;
          /**
          * Class representing an input component instance
          */
          class InputComponentInstance extends Labs.ComponentInstance<Components.InputComponentAttempt> {
            /**
            * The underlying IInputComponentInstance this class represents
            */
            public component: Components.IInputComponentInstance;
            /**
            * Constructs a new InputComponentInstance
            *
            * @param { component } The IInputComponentInstance to create this class from
            */
            constructor(component: Components.IInputComponentInstance);
            /**
            * Builds a new InputComponentAttempt. Implements abstract method defined on the base class.
            *
            * @param { createAttemptResult } The result from a create attempt action
            */
            public buildAttempt(createAttemptAction: Labs.Core.IAction): Components.InputComponentAttempt;
          }
        }
        declare module Labs.Components {
          /**
          * The result of an input component submission
          */
          class InputComponentResult {
            /**
            * The score associated with the submission
            */
            public score: any;
            /**
            * Whether or not the result resulted in the completion of the attempt
            */
            public complete: boolean;
            /**
            * Constructs a new InputComponentResult
            *
            * @param { score } The score of the result
            * @param { complete } Whether or not the result completed the attempt
            */
            constructor(score: any, complete: boolean);
          }
        }
        declare module Labs.Components {
          /**
          * Class that represents an input component submission
          */
          class InputComponentSubmission {
            /**
            * The answer associated with the submission
            */
            public answer: Components.InputComponentAnswer;
            /**
            * The result of the submission
            */
            public result: Components.InputComponentResult;
            /**
            * The time at which the submission was received
            */
            public time: number;
            /**
            * Constructs a new InputComponentSubmission
            *
            * @param { answer } The answer associated with the submission
            * @param { result } The result of the submission
            * @param { time } The time at which the submission was received
            */
            constructor(answer: Components.InputComponentAnswer, result: Components.InputComponentResult, time: number);
          }
        }
        declare module Labs {
          /**
          * State values for a lab
          */
          enum ProblemState {
            /**
            * The problem is in progress
            */
            InProgress,
            /**
            * The problem has timed out
            */
            Timeout,
            /**
            * The problem has completed
            */
            Completed,
          }
        }
        declare module Labs.Components {
          /**
          * The result of a choice component submission
          */
          class ChoiceComponentResult {
            /**
            * The score associated with the submission
            */
            public score: any;
            /**
            * Whether or not the result resulted in the completion of the attempt
            */
            public complete: boolean;
            /**
            * Constructs a new ChoiceComponentResult
            *
            * @param { score } The score of the result
            * @param { complete } Whether or not the result completed the attempt
            */
            constructor(score: any, complete: boolean);
          }
        }
        declare module Labs.Components {
          /**
          * Class that represents a choice component submission
          */
          class ChoiceComponentSubmission {
            /**
            * The answer associated with the submission
            */
            public answer: Components.ChoiceComponentAnswer;
            /**
            * The result of the submission
            */
            public result: Components.ChoiceComponentResult;
            /**
            * The time at which the submission was received
            */
            public time: number;
            /**
            * Constructs a new ChoiceComponentSubmission
            *
            * @param { answer } The answer associated with the submission
            * @param { result } The result of the submission
            * @param { time } The time at which the submission was received
            */
            constructor(answer: Components.ChoiceComponentAnswer, result: Components.ChoiceComponentResult, time: number);
          }
        }


        declare module Labs {
          /**
          * General command used to pass messages between the client and host
          */
          class Command {
            public type: string;
            public commandData: any;
            /**
            * Constructs a new command
            *
            * @param { type } The type of command
            * @param { commandData } Optional data associated with the command
            */
            constructor(type: string, commandData?: any);
          }
        }
        /**
        * Strings representing supported command types
        */
        declare module Labs.CommandType {
          var Connect: string;
          var Disconnect: string;
          var Create: string;
          var GetConfigurationInstance: string;
          var TakeAction: string;
          var GetCompletedActions: string;
          var ModeChanged: string;
          var GetConfiguration: string;
          var SetConfiguration: string;
          var GetState: string;
          var SetState: string;
          var SendMessage: string;
        }
        declare module Labs.Core {
          /**
          * Static class containing the different event types.
          */
          class EventTypes {
            /**
            * Mode changed event type. Fired whenever the lab mode is changed.
            */
            static ModeChanged: string;
            /**
            * Event invoked when the app becomes active.
            */
            static Activate: string;
            /**
            * Event invoked when the app is deactivated
            */
            static Deactivate: string;
          }
        }
        declare module Labs {
          /**
          * Command data associated with a GetActions command
          */
          interface GetActionsCommandData {
            /**
            * The type of get
            */
            type: string;
            /**
            * Options for the get command
            */
            options: Labs.Core.IGetActionOptions;
          }
        }
        declare module Labs {
          /**
          * Type of message being sent over the wire
          */
          enum MessageType {
            Message,
            Completion,
            Failure,
          }
          /**
          * The message being sent
          */
          class Message {
            public id: number;
            public labId: string;
            public type: MessageType;
            public payload: any;
            constructor(id: number, labId: string, type: MessageType, payload: any);
          }
          /**
          * Interface for defining event handlers
          */
          interface IMessageHandler {
            (origin: Window, data: any, callback: Labs.Core.ILabCallback<any>): void;
          }
          class MessageProcessor {
            public isStarted: boolean;
            public eventListener: EventListener;
            public nextMessageId: number;
            private messageMap;
            public targetOrigin: string;
            public messageHandler: IMessageHandler;
            private _labId;
            constructor(labId: string, targetOrigin: string, messageHandler: IMessageHandler);
            private throwIfNotStarted();
            private getNextMessageId();
            private parseOrigin(href);
            private listener(event);
            private postMessage(targetWindow, message);
            public start(): void;
            public stop(): void;
            public sendMessage(targetWindow: Window, data: any, callback: Labs.Core.ILabCallback<any>): void;
          }
        }
        declare module Labs.Core {
          /**
          * Data associated with a mode changed event
          */
          interface ModeChangedEventData {
            /**
            * The mode being set
            */
            mode: string;
          }
        }
        declare module Labs {
          /**
          * Data associated with a take action command
          */
          interface SendMessageCommandData {
            /**
            * The type of message
            */
            type: string;
            /**
            * Options associated with the message
            */
            options: Labs.Core.IMessage;
          }
        }
        declare module Labs {
          /**
          * Data associated with a take action command
          */
          interface TakeActionCommandData {
            /**
            * The type of action
            */
            type: string;
            /**
            * Options associated with the action
            */
            options: Labs.Core.IActionOptions;
            /**
            * The result of the action
            */
            result: Labs.Core.IActionResult;
          }
        }



        declare module Labs {
          interface IHostMessage {
            type: string;
            options: Labs.Core.IMessage;
            response: Labs.Core.IMessageResponse;
          }
          class InMemoryLabHost implements Labs.Core.ILabHost {
            private _version;
            private _labState;
            private _messages;
            constructor(version: Labs.Core.IVersion);
            public getSupportedVersions(): Labs.Core.ILabHostVersionInfo[];
            public connect(versions: Labs.Core.ILabHostVersionInfo[], callback: Labs.Core.ILabCallback<Labs.Core.IConnectionResponse>): void;
            public disconnect(callback: Labs.Core.ILabCallback<void>): void;
            public on(handler: (string: any, any: any) => void): void;
            public sendMessage(type: string, options: Labs.Core.IMessage, callback: Labs.Core.ILabCallback<Labs.Core.IMessageResponse>): void;
            public getMessages(): IHostMessage[];
            public create(options: Labs.Core.ILabCreationOptions, callback: Labs.Core.ILabCallback<void>): void;
            public getConfiguration(callback: Labs.Core.ILabCallback<Labs.Core.IConfiguration>): void;
            public setConfiguration(configuration: Labs.Core.IConfiguration, callback: Labs.Core.ILabCallback<void>): void;
            public getState(callback: Labs.Core.ILabCallback<any>): void;
            public setState(state: any, callback: Labs.Core.ILabCallback<void>): void;
            public getConfigurationInstance(callback: Labs.Core.ILabCallback<Labs.Core.IConfigurationInstance>): void;
            public takeAction(type: string, options: Labs.Core.IActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
            public takeAction(type: string, options: Labs.Core.IActionOptions, result: Labs.Core.IActionResult, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
            public getActions(type: string, options: Labs.Core.IGetActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction[]>): void;
          }
        }
        declare module Labs {
          class InMemoryLabState {
            private _configuration;
            private _configurationInstance;
            private _state;
            private _actions;
            private _nextId;
            private _componentInstances;
            constructor();
            public getConfiguration(): Labs.Core.IConfiguration;
            public setConfiguration(configuration: Labs.Core.IConfiguration): void;
            public getState(): any;
            public setState(state: any): void;
            public getConfigurationInstance(): Labs.Core.IConfigurationInstance;
            private getConfigurationInstanceFromConfiguration(configuration);
            private getAndStoreComponentInstanceFromComponent(component);
            public takeAction(type: string, options: Labs.Core.IActionOptions, result: any): Labs.Core.IAction;
            private takeActionCore(type, options, result);
            private findConfigurationValue(componentId, attemptId, valueId);
            public getAllActions(): Labs.Core.IAction[];
            public setActions(actions: Labs.Core.IAction[]): void;
            public getActions(type: string, options: Labs.Core.IGetActionOptions): Labs.Core.IAction[];
          }
        }
        interface OfficeInterface {
          initialize: any;
          context: any;
          AsyncResultStatus: any;
          Index: any;
          GoToType: any;
        }
        declare var Office: OfficeInterface;
        declare module Labs {
          interface IPromise {
            then(callback: Function);
          }
          class Resolver {
            private _callbacks;
            private _isResolved;
            private _resolvedValue;
            public promise: IPromise;
            constructor();
            public resolve(value?: any): void;
            private fireCallbacks();
          }
          interface ILabsSettings {
            /**
            * The lab configuration
            */
            configuration?: Labs.Core.IConfiguration;
            /**
            * The version of the host used to create the lab
            */
            hostVersion?: Labs.Core.IVersion;
            /**
            * Boolean that is set to true when the lab is published
            */
            published?: boolean;
            /**
            * The published ID of the lab
            */
            publishedAppId?: string;
          }
          class OfficeJSLabHost implements Labs.Core.ILabHost {
            private _officeInitialized;
            private _labHost;
            private _version;
            static SettingsKeyName: string;
            constructor();
            public getSupportedVersions(): Labs.Core.ILabHostVersionInfo[];
            public connect(versions: Labs.Core.ILabHostVersionInfo[], callback: Labs.Core.ILabCallback<Labs.Core.IConnectionResponse>): void;
            public disconnect(callback: Labs.Core.ILabCallback<void>): void;
            public on(handler: (string: any, any: any) => void): void;
            public sendMessage(type: string, options: Labs.Core.IMessage, callback: Labs.Core.ILabCallback<Labs.Core.IMessageResponse>): void;
            public create(options: Labs.Core.ILabCreationOptions, callback: Labs.Core.ILabCallback<void>): void;
            public getConfiguration(callback: Labs.Core.ILabCallback<Labs.Core.IConfiguration>): void;
            public setConfiguration(configuration: Labs.Core.IConfiguration, callback: Labs.Core.ILabCallback<void>): void;
            public getConfigurationInstance(callback: Labs.Core.ILabCallback<Labs.Core.IConfigurationInstance>): void;
            public getState(callback: Labs.Core.ILabCallback<any>): void;
            public setState(state: any, callback: Labs.Core.ILabCallback<void>): void;
            public takeAction(type: string, options: Labs.Core.IActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
            public takeAction(type: string, options: Labs.Core.IActionOptions, result: Labs.Core.IActionResult, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
            public getActions(type: string, options: Labs.Core.IGetActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction[]>): void;
          }
        }
        declare module Labs {
          /**
          * PostMessageLabHost - ILabHost that uses PostMessage for its communication mechanism
          */
          class PostMessageLabHost implements Labs.Core.ILabHost {
            private _handlers;
            private _messageProcessor;
            private _version;
            private _targetWindow;
            private _state;
            private _deferredEvents;
            constructor(labId: string, targetWindow: Window, targetOrigin: string);
            private handleEvent(command, callback);
            private invokeDeferredEvents(err);
            private invokeEvent(err, command, callback);
            public getSupportedVersions(): Labs.Core.ILabHostVersionInfo[];
            public connect(versions: Labs.Core.ILabHostVersionInfo[], callback: Labs.Core.ILabCallback<Labs.Core.IConnectionResponse>): void;
            public disconnect(callback: Labs.Core.ILabCallback<void>): void;
            public on(handler: (string: any, any: any) => void): void;
            public sendMessage(type: string, options: Labs.Core.IMessage, callback: Labs.Core.ILabCallback<Labs.Core.IMessageResponse>): void;
            public create(options: Labs.Core.ILabCreationOptions, callback: Labs.Core.ILabCallback<void>): void;
            public getConfiguration(callback: Labs.Core.ILabCallback<Labs.Core.IConfiguration>): void;
            public setConfiguration(configuration: Labs.Core.IConfiguration, callback: Labs.Core.ILabCallback<void>): void;
            public getConfigurationInstance(callback: Labs.Core.ILabCallback<Labs.Core.IConfigurationInstance>): void;
            public getState(callback: Labs.Core.ILabCallback<any>): void;
            public setState(state: any, callback: Labs.Core.ILabCallback<void>): void;
            public takeAction(type: string, options: Labs.Core.IActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
            public takeAction(type: string, options: Labs.Core.IActionOptions, result: Labs.Core.IActionResult, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
            public getActions(type: string, options: Labs.Core.IGetActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction[]>): void;
            private sendCommand(command, callback);
          }
        }
        declare module Labs {
          class RichClientOfficeJSLabsHost implements Labs.Core.ILabHost {
            private _handlers;
            private _activeMode;
            private _version;
            private _labState;
            private _createdHostVersion;
            private _activeViewP;
            constructor(configuration: Labs.Core.IConfiguration, createdHostVersion: Labs.Core.IVersion);
            private getLabModeFromActiveView(view);
            public getSupportedVersions(): Labs.Core.ILabHostVersionInfo[];
            public connect(versions: Labs.Core.ILabHostVersionInfo[], callback: Labs.Core.ILabCallback<Labs.Core.IConnectionResponse>): void;
            public disconnect(callback: Labs.Core.ILabCallback<void>): void;
            public on(handler: (string: any, any: any) => void): void;
            public sendMessage(type: string, options: Labs.Core.IMessage, callback: Labs.Core.ILabCallback<Labs.Core.IMessageResponse>): void;
            public create(options: Labs.Core.ILabCreationOptions, callback: Labs.Core.ILabCallback<void>): void;
            public getConfiguration(callback: Labs.Core.ILabCallback<Labs.Core.IConfiguration>): void;
            public setConfiguration(configuration: Labs.Core.IConfiguration, callback: Labs.Core.ILabCallback<void>): void;
            private updateStoredLabsState(callback);
            public getConfigurationInstance(callback: Labs.Core.ILabCallback<Labs.Core.IConfigurationInstance>): void;
            public getState(callback: Labs.Core.ILabCallback<any>): void;
            public setState(state: any, callback: Labs.Core.ILabCallback<void>): void;
            public takeAction(type: string, options: Labs.Core.IActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
            public takeAction(type: string, options: Labs.Core.IActionOptions, result: Labs.Core.IActionResult, callback: Labs.Core.ILabCallback<Labs.Core.IAction>);
            public getActions(type: string, options: Labs.Core.IGetActionOptions, callback: Labs.Core.ILabCallback<Labs.Core.IAction[]>): void;
          }
        }
