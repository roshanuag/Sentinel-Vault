#!/usr/bin/env python3
"""
Compile contracts/LogVault.sol to contracts/LogVault.json (ABI + bytecode).

Run once (needs internet the first time to download the solc binary):
    python contracts/build.py

The produced LogVault.json is committed so the runtime adapter never needs a
Solidity compiler - it just loads the ABI and bytecode.
"""

import json
import os

import solcx

SOLC_VERSION = "0.8.26"
HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "LogVault.sol")
OUTPUT = os.path.join(HERE, "LogVault.json")


def main():
    installed = [str(v) for v in solcx.get_installed_solc_versions()]
    if SOLC_VERSION not in installed:
        print(f"Installing solc {SOLC_VERSION} (one-time download)...")
        solcx.install_solc(SOLC_VERSION)

    print(f"Compiling {SOURCE} with solc {SOLC_VERSION}...")
    compiled = solcx.compile_files(
        [SOURCE],
        output_values=["abi", "bin"],
        solc_version=SOLC_VERSION,
    )
    # compile_files keys look like ".../LogVault.sol:LogVault"
    key = next(k for k in compiled if k.endswith(":LogVault"))
    artifact = {
        "contract": "LogVault",
        "solc_version": SOLC_VERSION,
        "abi": compiled[key]["abi"],
        "bytecode": compiled[key]["bin"],
    }
    with open(OUTPUT, "w", encoding="utf-8") as fh:
        json.dump(artifact, fh, indent=2)
    print(f"Wrote {OUTPUT} ({len(artifact['bytecode'])} hex chars of bytecode, "
          f"{len(artifact['abi'])} ABI entries).")


if __name__ == "__main__":
    main()
