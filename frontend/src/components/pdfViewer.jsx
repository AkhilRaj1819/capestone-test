import React, { useState } from "react";
import { Document, Page } from "react-pdf";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

// Set the workerSrc
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PdfViewerWithSummary = () => {
  const [pageNumber, setPageNumber] = useState(1); // Current page
  const [numPages, setNumPages] = useState(null); // Total pages
  const [summary, setSummary] = useState(""); // Summary of the current page

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const nextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
      extractSummary(pageNumber + 1);
    }
  };

  const previousPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
      extractSummary(pageNumber - 1);
    }
  };

  const extractSummary = async (page) => {
    try {
      const pdf = await pdfjsLib.getDocument("./Zero to one.pdf").promise; // Load the PDF
      const pdfPage = await pdf.getPage(page); // Get the specified page
      const textContent = await pdfPage.getTextContent(); // Extract text content

      const pageText = textContent.items.map((item) => item.str).join(" ");

      // Generate a simple "summary" (e.g., first 100 characters)
      const generatedSummary = pageText.substring(0, 100) + "...";
      setSummary(generatedSummary);
    } catch (error) {
      console.error("Error extracting summary:", error);
    }
  };

  // Extract summary for the first page on mount
  React.useEffect(() => {
    extractSummary(pageNumber);
  }, []);

  return (
    <div>
      <Document
        file="./Zero to one.pdf" // Path to your PDF
        onLoadSuccess={onDocumentLoadSuccess}
      >
        <Page pageNumber={pageNumber} />
      </Document>
      <p>
        Page {pageNumber} of {numPages}
      </p>
      <p>
        <strong>Summary:</strong> {summary}
      </p>
      <button onClick={previousPage} disabled={pageNumber <= 1}>
        Previous
      </button>
      <button onClick={nextPage} disabled={pageNumber >= numPages}>
        Next
      </button>
    </div>
  );
};

export default PdfViewerWithSummary;