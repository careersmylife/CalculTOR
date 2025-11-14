import React, { useState, useRef, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import { exportToPDF } from '../../services/pdfService';

interface ExportPDFButtonProps {
  elementId: string;
  defaultTitle: string;
  defaultOrientation?: 'p' | 'l';
}

const ExportPDFButton: React.FC<ExportPDFButtonProps> = ({
  elementId,
  defaultTitle,
  defaultOrientation = 'p',
}) => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const storageKey = `pdfExportOptions_${elementId}`;

  const [pdfTitle, setPdfTitle] = useState(defaultTitle);
  const [includeDateTime, setIncludeDateTime] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved).includeDateTime ?? true : true;
  });
  const [pdfOrientation, setPdfOrientation] = useState<'p' | 'l'>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved).orientation ?? defaultOrientation : defaultOrientation;
  });
  
  useEffect(() => {
    const options = { includeDateTime, orientation: pdfOrientation };
    localStorage.setItem(storageKey, JSON.stringify(options));
  }, [includeDateTime, pdfOrientation, storageKey]);

  const handleGeneratePdf = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const options = {
      title: pdfTitle,
      includeDateTime,
      orientation: pdfOrientation,
    };
    const filename = `${pdfTitle.toLowerCase().replace(/\s/g, '-')}.pdf`;

    try {
      await exportToPDF(elementId, filename, options);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("There was an error creating the PDF.");
    } finally {
      setIsLoading(false);
      setIsOptionsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOptionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);
  
  useEffect(() => {
      setPdfTitle(defaultTitle);
  }, [defaultTitle]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      setPdfOrientation(defaultOrientation);
    }
  }, [defaultOrientation, storageKey]);


  return (
    <div className="relative inline-block text-left" ref={wrapperRef}>
      <div className="flex rounded-lg shadow-sm">
        <Button
          onClick={handleGeneratePdf}
          className="rounded-r-none w-48 text-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i> Generating...
            </>
          ) : (
            <>
              <i className="fas fa-file-pdf mr-2"></i> Export to PDF
            </>
          )}
        </Button>
        <Button
          onClick={() => setIsOptionsOpen(!isOptionsOpen)}
          className="rounded-l-none px-3"
          aria-haspopup="true"
          aria-expanded={isOptionsOpen}
          disabled={isLoading}
        >
          <i className={`fas fa-chevron-down transition-transform duration-200 ${isOptionsOpen ? 'rotate-180' : ''}`}></i>
        </Button>
      </div>

      {isOptionsOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-secondary dark:bg-[#1A1A1A] ring-1 ring-black ring-opacity-5 focus:outline-none z-10 p-4"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <div className="space-y-4" role="none">
            <h4 className="text-md font-semibold text-text-primary dark:text-[#F2F2F2]">Export Options</h4>
            <Input
              label="Report Title"
              id="pdfTitle"
              value={pdfTitle}
              onChange={(e) => setPdfTitle(e.target.value)}
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeDateTime"
                checked={includeDateTime}
                onChange={(e) => setIncludeDateTime(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <label htmlFor="includeDateTime" className="ml-2 block text-sm text-text-secondary dark:text-[#BDBDBD]">
                Include current date and time
              </label>
            </div>
            <div>
              <span className="block text-sm font-medium text-text-secondary dark:text-[#BDBDBD] mb-1">Layout</span>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input type="radio" name="orientation" value="p" checked={pdfOrientation === 'p'} onChange={() => setPdfOrientation('p')} className="text-accent focus:ring-accent" />
                  <span className="ml-2 text-sm text-text-primary dark:text-[#F2F2F2]">Portrait</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="orientation" value="l" checked={pdfOrientation === 'l'} onChange={() => setPdfOrientation('l')} className="text-accent focus:ring-accent" />
                  <span className="ml-2 text-sm text-text-primary dark:text-[#F2F2F2]">Landscape</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPDFButton;