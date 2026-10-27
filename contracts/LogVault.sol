// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title LogVault - on-chain anchor for tamper-proof log windows
/// @notice Stores one immutable fingerprint (chainHash) per log time-window.
///         Anchoring is append-only: a window id can be written once and can
///         never be overwritten or deleted, so a later edit to the logs is
///         detectable by comparing a freshly computed chainHash against the one
///         recorded here.
contract LogVault {
    struct Record {
        bytes32 chainHash;   // the window's chained SHA-256 fingerprint
        uint256 timestamp;   // when the window was anchored (seconds)
        bool exists;         // true once anchored
    }

    // windowId (e.g. 20261027100000 = 2026-10-27 10:00:00) => Record
    mapping(uint256 => Record) private records;
    uint256[] private windowIds;

    event WindowAnchored(uint256 indexed windowId, bytes32 chainHash, uint256 timestamp);

    /// @notice Anchor one window. Reverts if the window id was already anchored.
    function anchorWindow(uint256 windowId, bytes32 chainHash, uint256 timestamp) external {
        require(!records[windowId].exists, "LogVault: window already anchored");
        records[windowId] = Record(chainHash, timestamp, true);
        windowIds.push(windowId);
        emit WindowAnchored(windowId, chainHash, timestamp);
    }

    /// @notice Read one window's anchored record.
    function getWindow(uint256 windowId)
        external
        view
        returns (bytes32 chainHash, uint256 timestamp, bool exists)
    {
        Record memory r = records[windowId];
        return (r.chainHash, r.timestamp, r.exists);
    }

    /// @notice How many windows have been anchored.
    function getWindowCount() external view returns (uint256) {
        return windowIds.length;
    }

    /// @notice The window id stored at a given index (for enumeration).
    function windowIdAt(uint256 index) external view returns (uint256) {
        return windowIds[index];
    }
}
