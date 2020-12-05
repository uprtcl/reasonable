pragma solidity ^0.5.0;

import './SafeMath64.sol';
import './TimeHelpers.sol';

contract Delay is TimeHelpers {
    using SafeMath64 for uint64;

    bytes32 public constant SET_DELAY_ROLE = keccak256("SET_DELAY_ROLE");
    bytes32 public constant DELAY_EXECUTION_ROLE = keccak256("DELAY_EXECUTION_ROLE");
    bytes32 public constant PAUSE_EXECUTION_ROLE = keccak256("PAUSE_EXECUTION_ROLE");
    bytes32 public constant RESUME_EXECUTION_ROLE = keccak256("RESUME_EXECUTION_ROLE");
    bytes32 public constant CANCEL_EXECUTION_ROLE = keccak256("CANCEL_EXECUTION_ROLE");

    string private constant ERROR_NO_SCRIPT = "DELAY_NO_SCRIPT";
    string private constant ERROR_CAN_NOT_EXECUTE = "DELAY_CAN_NOT_EXECUTE";
    string private constant ERROR_CAN_NOT_PAUSE = "DELAY_CAN_NOT_PAUSE";
    string private constant ERROR_SCRIPT_EXECUTION_PASSED = "DELAY_SCRIPT_EXECUTION_PASSED";
    string private constant ERROR_CAN_NOT_RESUME = "DELAY_CAN_NOT_RESUME";
    string private constant ERROR_CAN_NOT_FORWARD = "DELAY_CAN_NOT_FORWARD";

    struct DelayedScript {
        uint64 executionTime;
        uint64 pausedAt;
        address on;
        uint256 value;
        bytes data;
    }

    uint64 public executionDelay;
    uint256 public delayedScriptsNewIndex = 0;
    mapping(uint256 => DelayedScript) public delayedScripts;
    mapping(bytes32 => address) public permissions;

    event DelayedScriptStored(uint256 scriptId);
    event ExecutionDelaySet(uint64 executionDelay);
    event ExecutedScript(uint256 scriptId, address indexed _contract, bytes _data, uint _value, bool _success);
    event ExecutionPaused(uint256 scriptId);
    event ExecutionResumed(uint256 scriptId);
    event ExecutionCancelled(uint256 scriptId);

    modifier scriptExists(uint256 _scriptId) {
        require(delayedScripts[_scriptId].executionTime != 0, ERROR_NO_SCRIPT);
        _;
    }

    modifier auth(bytes32 role) {
        require(permissions[role] == msg.sender, "msg sender not authorized");
        _;
    }

    /**
    * @notice Initialize the Delay app
    * @param _executionDelay The delay in seconds a user will have to wait before executing a script
    */
     constructor(uint64 _executionDelay, address[5] memory _permissions) public {
        executionDelay = _executionDelay;
        permissions[SET_DELAY_ROLE] = _permissions[0];
        permissions[DELAY_EXECUTION_ROLE] = _permissions[1];
        permissions[PAUSE_EXECUTION_ROLE] = _permissions[2];
        permissions[RESUME_EXECUTION_ROLE] = _permissions[3];
        permissions[CANCEL_EXECUTION_ROLE] = _permissions[4];
    }
    
    /**
    * @notice Set the execution delay to `_executionDelay`
    * @param _executionDelay The new execution delay
    */
    function setExecutionDelay(uint64 _executionDelay) external auth(SET_DELAY_ROLE) {
        executionDelay = _executionDelay;

        emit ExecutionDelaySet(executionDelay);
    }

    /**
    * @notice Delays execution for `@transformTime(self.executionDelay(): uint)`
    */
    function delayExecution(address on, bytes calldata _callData, uint256 value) external auth(DELAY_EXECUTION_ROLE) returns (uint256) {
        return _delayExecution(on, _callData, value);
    }

    /**
    * @notice Pause the script execution with ID `_delayedScriptId`
    * @param _delayedScriptId The ID of the script execution to pause
    */
    function pauseExecution(uint256 _delayedScriptId) external auth(PAUSE_EXECUTION_ROLE) {
        DelayedScript storage delayedScript = delayedScripts[_delayedScriptId];
        require(!_isExecutionPaused(_delayedScriptId), ERROR_CAN_NOT_PAUSE);
        require(getTimestamp64() < delayedScript.executionTime, ERROR_SCRIPT_EXECUTION_PASSED);

        delayedScript.pausedAt = getTimestamp64();

        emit ExecutionPaused(_delayedScriptId);
    }

    /**
    * @notice Resume a paused script execution with ID `_delayedScriptId`
    * @param _delayedScriptId The ID of the script execution to resume
    */
    function resumeExecution(uint256 _delayedScriptId) external auth(RESUME_EXECUTION_ROLE) {
        require(_isExecutionPaused(_delayedScriptId), ERROR_CAN_NOT_RESUME);
        DelayedScript storage delayedScript = delayedScripts[_delayedScriptId];

        uint64 timePaused = getTimestamp64().sub(delayedScript.pausedAt);
        delayedScript.executionTime = delayedScript.executionTime.add(timePaused);
        delayedScript.pausedAt = 0;

        emit ExecutionResumed(_delayedScriptId);
    }

    /**
    * @notice Cancel script execution with ID `_delayedScriptId`
    * @param _delayedScriptId The ID of the script execution to cancel
    */
    function cancelExecution(uint256 _delayedScriptId) external scriptExists(_delayedScriptId) auth(CANCEL_EXECUTION_ROLE) {
        delete delayedScripts[_delayedScriptId];

        emit ExecutionCancelled(_delayedScriptId);
    }

    /**
    * @notice Execute the script with ID `_delayedScriptId`
    * @param _delayedScriptId The ID of the script to execute
    */
    function execute(uint256 _delayedScriptId) external returns(bool success, bytes memory returnValue) {
        require(canExecute(_delayedScriptId), ERROR_CAN_NOT_EXECUTE);

        DelayedScript memory delayedScript = delayedScripts[_delayedScriptId];
        delete delayedScripts[_delayedScriptId];

        (success, returnValue) = delayedScript.on.call(delayedScript.data);

        emit ExecutedScript(_delayedScriptId, delayedScript.on, delayedScript.data, 0, success);
    }

    /**
    * @notice Return whether a script with ID #`_scriptId` can be executed
    * @param _scriptId The ID of the script to execute
    */
    function canExecute(uint256 _scriptId) public view returns (bool) {
        bool withinExecutionWindow = getTimestamp64() > delayedScripts[_scriptId].executionTime;
        bool isUnpaused = !_isExecutionPaused(_scriptId);

        return withinExecutionWindow && isUnpaused;
    }

    function _isExecutionPaused(uint256 _scriptId) internal view scriptExists(_scriptId) returns (bool) {
        return delayedScripts[_scriptId].pausedAt != 0;
    }

    function _delayExecution(address on, bytes memory _callData, uint256 value) internal returns (uint256) {
        uint256 delayedScriptIndex = delayedScriptsNewIndex;
        delayedScriptsNewIndex++;

        delayedScripts[delayedScriptIndex] = DelayedScript(getTimestamp64().add(executionDelay), 0, on, value, _callData);

        emit DelayedScriptStored(delayedScriptIndex);

        return delayedScriptIndex;
    }

}
