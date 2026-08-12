import brandMark from "../assets/brand-mark.png";

export function Brand({ compact = false }: { readonly compact?: boolean }) {
  return (
    <div className={compact ? "brand brand--compact" : "brand"}>
      <span className="brand__mark" aria-hidden="true">
        <img src={brandMark} alt="" />
      </span>
      <span>DriveTransfer</span>
    </div>
  );
}
