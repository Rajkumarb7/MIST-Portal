const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, 
        AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const doc = new Document({
  styles: {
    default: { 
      document: { run: { font: "Arial", size: 24 } } 
    },
    paragraphStyles: [
      { 
        id: "Heading1", 
        name: "Heading 1", 
        basedOn: "Normal", 
        next: "Normal", 
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F4788" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
      },
      { 
        id: "Heading2", 
        name: "Heading 2", 
        basedOn: "Normal", 
        next: "Normal", 
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 }
      }
    ]
  },
  numbering: {
    config: [
      { 
        reference: "bullets",
        levels: [{ 
          level: 0, 
          format: "bullet", 
          text: "•", 
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // Cover
      new Paragraph({
        children: [new TextRun({ text: "MIST PORTAL", size: 48, bold: true, color: "1F4788" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2880, after: 400 }
      }),
      new Paragraph({
        children: [new TextRun({ text: "Application Analysis & Review Report", size: 32, color: "2E75B6" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1440 }
      }),
      new Paragraph({
        children: [new TextRun({ text: "Prepared for: Raj Kumar", size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: "February 14, 2026", size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: "Testing Phase Assessment", size: 24, bold: true, color: "C65911" })],
        alignment: AlignmentType.CENTER
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Executive Summary
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("EXECUTIVE SUMMARY")]
      }),
      new Paragraph({
        children: [new TextRun("The MIST Portal is a React-based timesheet management system for disability support services. This analysis identifies critical issues that must be resolved before production deployment.")],
        spacing: { after: 400 }
      }),

      // Status Table
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ 
                  children: [new TextRun({ text: "Category", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ 
                  children: [new TextRun({ text: "Status", bold: true, color: "FFFFFF" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Overall", bold: true })] })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "NOT PRODUCTION READY", color: "C00000", bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Code Quality")] })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Good", color: "00B050" })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Security")] })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Critical Issues", color: "C00000" })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Testing")] })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "None", color: "C00000" })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun("Features")] })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Complete", color: "00B050" })] })]
              })
            ]
          })
        ]
      }),

      new Paragraph({ text: "", spacing: { after: 400 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Critical Issues")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Build Failure: Missing rollup dependency prevents builds", bold: true })]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Security: Hardcoded passwords in source code", bold: true })]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Data Security: Unencrypted localStorage", bold: true })]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Testing: No test framework configured", bold: true })]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Details sections
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("APPLICATION OVERVIEW")]
      }),
      new Paragraph({
        children: [new TextRun("MIST Portal is a comprehensive timesheet management system designed specifically for disability support services. It enables staff to log shifts, track earnings across different shift types, and sync data to Google Sheets.")]
      }),
      new Paragraph({ text: "", spacing: { after: 200 } }),
      
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Core Features")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Role-based authentication (Manager, Staff, Client)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Staff management with individual rate structures")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Timesheet entry with automatic earnings calculation")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Financial reporting with fortnight-based filtering")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Analytics dashboard with data visualization")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Automatic Google Sheets synchronization")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Mobile-responsive design")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("TECHNICAL ARCHITECTURE")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Technology Stack", bold: true })]
      }),
      new Paragraph({
        children: [new TextRun("Frontend: React 19 + TypeScript 5.6 + Vite 6")]
      }),
      new Paragraph({
        children: [new TextRun("Styling: Tailwind CSS 3.4 with custom MIST branding")]
      }),
      new Paragraph({
        children: [new TextRun("State: React Hooks with localStorage persistence")]
      }),
      new Paragraph({
        children: [new TextRun("Charts: Recharts 2.13 for data visualization")]
      }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Strengths")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Well-structured component architecture")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Comprehensive TypeScript type definitions")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Clear separation of concerns (services, components)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Meaningful git history with 20+ commits")]
      }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Areas for Improvement")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Large components - TimesheetManagement.tsx is 36KB")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("No React error boundaries")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Limited inline documentation")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("SECURITY ANALYSIS")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "CRITICAL VULNERABILITIES IDENTIFIED", bold: true, color: "C00000" })]
      }),
      new Paragraph({ text: "", spacing: { after: 200 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1. Hardcoded Passwords")]
      }),
      new Paragraph({
        children: [new TextRun("Location: constants.ts lines 4-8")]
      }),
      new Paragraph({
        children: [new TextRun("Passwords are stored in plain text in source code, accessible to anyone with codebase access or browser DevTools.")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Solution: ", bold: true }), new TextRun("Implement proper authentication (bcrypt, JWT, OAuth, Firebase Auth, Auth0)")]
      }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2. Unencrypted localStorage")]
      }),
      new Paragraph({
        children: [new TextRun("All sensitive data stored in browser localStorage without encryption: staff info, client names, financial data, webhook URLs.")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Solution: ", bold: true }), new TextRun("Migrate to backend database OR encrypt localStorage with Web Crypto API")]
      }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3. Additional Concerns")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("No input validation (XSS vulnerability)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("No rate limiting (brute force vulnerability)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("CORS bypass via iframes cannot verify success")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("RECOMMENDATIONS")]
      }),
      
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Critical Priority (Must Fix)")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Fix build: ", bold: true }), new TextRun("Delete node_modules, reinstall dependencies")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Authentication: ", bold: true }), new TextRun("Replace hardcoded passwords with proper auth system")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Data security: ", bold: true }), new TextRun("Encrypt localStorage or migrate to backend")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Testing: ", bold: true }), new TextRun("Install Vitest, write tests, set up CI/CD")]
      }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Timeline")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Estimated 4-7 weeks to production:", bold: true })]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Critical fixes: 2-3 weeks")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("High priority: 1-2 weeks")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Testing: 1 week")]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Security audit: 3-5 days")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("CONCLUSION")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "CONTINUE WITH THE PROJECT", bold: true, color: "00B050" })]
      }),
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Paragraph({
        children: [new TextRun("The MIST Portal has a solid foundation with complete features and good architecture. The critical issues are addressable with focused effort. The hard work of implementing business logic is complete. Remaining work is security hardening and testing - standard activities for production.")]
      }),
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Paragraph({
        children: [new TextRun("With recommended improvements, MIST Portal will provide significant value to the disability support services sector.")]
      }),

      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        children: [new TextRun({ text: "END OF REPORT", bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000 }
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/sessions/kind-inspiring-ramanujan/mnt/MIST-Portal/MIST_Portal_Analysis_Report.docx', buffer);
  console.log('Report generated successfully');
}).catch(err => {
  console.error('Error:', err);
});
