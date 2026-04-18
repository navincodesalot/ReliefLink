import { Badge } from "@/components/ui/badge";

type Props = {
  status: string;
  isFlagged?: boolean;
};

export function StatusBadge({ status, isFlagged }: Props) {
  if (isFlagged || status === "flagged") {
    return <Badge variant="destructive">flagged</Badge>;
  }
  if (status === "delivered") {
    return <Badge variant="success">delivered</Badge>;
  }
  if (status === "in_transit") {
    return <Badge variant="warning">in transit</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}
