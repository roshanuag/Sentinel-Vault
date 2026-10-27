import React from "react";
import { Link } from "lucide-react";
import { shortHash } from "../lib/ui";

interface ChainConnectorProps {
  prevChainHash?: string;
  nextChainHash?: string;
  isBroken?: boolean;
}

export const ChainConnector: React.FC<ChainConnectorProps> = ({
  prevChainHash,
  nextChainHash,
  isBroken = false,
}) => {
  return (
    <div className="relative py-2 flex items-center justify-center">
      {/* Vertical Linkage Line */}
      <div
        className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors ${
          isBroken
            ? "bg-gradient-to-b from-[#BA4A38] via-[#BA4A38] to-[#BA4A38]/40 shadow-[0_0_8px_#BA4A38]"
            : "bg-gradient-to-b from-[#A07855]/30 via-[#A07855]/70 to-[#A07855]/30"
        }`}
      />

      {/* Center Cryptographic Link Badge */}
      <div
        className={`relative z-10 flex items-center gap-2 px-3 py-1 rounded-[6px] text-[10px] font-mono border backdrop-blur-md transition-all shadow-sm ${
          isBroken
            ? "bg-[#EDE6DA] border-[#BA4A38] text-[#BA4A38] shadow-sm font-bold"
            : "bg-[#FFFFFF] border-[#D5CDBD] text-[#A07855] font-semibold"
        }`}
      >
        <Link className={`w-3 h-3 ${isBroken ? "text-[#BA4A38]" : "text-[#A07855]"}`} />
        <span>
          {isBroken ? "CRYPTOGRAPHIC CHAIN BROKEN" : "SHA-256 LINKED"}
        </span>
        {prevChainHash && (
          <span className="text-[#7E756B] hidden sm:inline">
            ({shortHash(prevChainHash, 4, 4)}{nextChainHash ? ` → ${shortHash(nextChainHash, 4, 4)}` : ""})
          </span>
        )}
      </div>
    </div>
  );
};
