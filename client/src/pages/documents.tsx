import { DocumentList } from "../components/document/document-list";
import { motion } from "framer-motion";

export default function DocumentsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <DocumentList />
    </div>
  );
}