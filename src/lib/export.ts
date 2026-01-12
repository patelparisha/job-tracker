import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, convertInchesToTwip, TabStopPosition, TabStopType } from 'docx';
import { saveAs } from 'file-saver';
import type { MasterResume } from '@/types/resume';

interface ExportContent {
  resume: string;
  coverLetter: string;
  companyName: string;
  roleName: string;
  masterResume?: MasterResume;
}

// Professional resume PDF matching reference format
// US Letter (8.5 × 11 inches), 0.7" margins, single-page layout
// Sans-serif font (Helvetica), black text on white background
// No italics, no color, no text boxes
export async function exportToPDF(content: ExportContent, type: 'resume' | 'coverLetter' | 'both') {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter', // 8.5 x 11 inches (612 x 792 pt)
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 612 pt
  const pageHeight = pdf.internal.pageSize.getHeight(); // 792 pt
  
  // 0.7 inches = ~50.4 pt margins
  const marginLeft = 50;
  const marginRight = 50;
  const marginTop = 50;
  const marginBottom = 50;
  const contentWidth = pageWidth - marginLeft - marginRight; // ~512 pt
  
  let yPosition = marginTop;

  // Font sizes (matching spec)
  const FONT_SIZE = {
    name: 15,           // 14-16 pt, bold, centered
    contact: 9.5,       // 9.5-10 pt, centered
    sectionHeader: 10.5, // 10.5-11 pt, bold, ALL CAPS
    roleTitle: 10,      // 10-10.5 pt, bold
    body: 9.5,          // 9.5-10 pt, regular
  };

  // Spacing (~10-12 pt between sections)
  const SPACING = {
    afterName: 14,
    afterContact: 16,
    afterSectionHeader: 10,
    afterRoleLine: 10,
    afterOrgLine: 10,
    bulletLine: 11,
    betweenBullets: 0,
    betweenEntries: 6,
    betweenSections: 12,
  };

  // Hanging indent for bullets (~0.25-0.3 inches = 18-22 pt)
  const bulletIndent = 20;

  // Helper functions
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - marginBottom) {
      pdf.addPage();
      yPosition = marginTop;
      return true;
    }
    return false;
  };

  // Thin horizontal rule beneath section headers
  const drawLine = (y: number, thickness: number = 0.5) => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(thickness);
    pdf.line(marginLeft, y, pageWidth - marginRight, y);
  };

  if (type === 'resume' || type === 'both') {
    // If we have master resume data, use structured format
    if (content.masterResume) {
      const resume = content.masterResume;

      // === HEADER ===
      // Name - centered, 14-16 pt, bold
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(FONT_SIZE.name);
      pdf.setTextColor(0, 0, 0); // Black text
      const name = resume.header.name || 'Your Name';
      const nameWidth = pdf.getTextWidth(name);
      pdf.text(name, (pageWidth - nameWidth) / 2, yPosition);
      yPosition += SPACING.afterName;

      // Contact info - centered, 9.5-10 pt, single line with separators
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZE.contact);
      const contactParts = [
        resume.header.location,
        resume.header.phone,
        resume.header.email,
        resume.header.linkedin,
      ].filter(Boolean);
      const contactLine = contactParts.join(' | ');
      const contactWidth = pdf.getTextWidth(contactLine);
      pdf.text(contactLine, (pageWidth - contactWidth) / 2, yPosition);
      yPosition += SPACING.afterContact;

      // === EDUCATION SECTION ===
      if (resume.education.length > 0) {
        // Section header - 10.5-11 pt, bold, ALL CAPS with thin underline
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(FONT_SIZE.sectionHeader);
        pdf.text('EDUCATION', marginLeft, yPosition);
        yPosition += 2;
        drawLine(yPosition);
        yPosition += SPACING.afterSectionHeader;

        for (const edu of resume.education) {
          addNewPageIfNeeded(50);

          // Degree (bold) and date (right-aligned) on same line
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(FONT_SIZE.roleTitle);
          const degree = `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`;
          pdf.text(degree, marginLeft, yPosition);
          
          pdf.setFont('helvetica', 'normal');
          const dateText = edu.graduationDate;
          const dateWidth = pdf.getTextWidth(dateText);
          pdf.text(dateText, pageWidth - marginRight - dateWidth, yPosition);
          yPosition += SPACING.afterRoleLine;

          // School and location
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(FONT_SIZE.body);
          const schoolLine = `${edu.school}${edu.location ? `, ${edu.location}` : ''}`;
          pdf.text(schoolLine, marginLeft, yPosition);
          yPosition += edu.bullets.filter(b => b.enabled).length > 0 ? SPACING.afterOrgLine : SPACING.betweenSections;

          // Bullets - solid round bullets with hanging indent
          for (const bullet of edu.bullets.filter(b => b.enabled)) {
            addNewPageIfNeeded(20);
            pdf.setFontSize(FONT_SIZE.body);
            const bulletText = `• ${bullet.text}`;
            const lines = pdf.splitTextToSize(bulletText, contentWidth - bulletIndent);
            for (let i = 0; i < lines.length; i++) {
              pdf.text(lines[i], marginLeft + (i === 0 ? 0 : bulletIndent), yPosition);
              yPosition += SPACING.bulletLine;
            }
          }
        }
        yPosition += SPACING.betweenEntries;
      }

      // === WORK EXPERIENCE SECTION ===
      if (resume.experience.length > 0) {
        addNewPageIfNeeded(60);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('WORK EXPERIENCE', marginLeft, yPosition);
        yPosition += 2;
        drawLine(yPosition);
        yPosition += 12;

        for (const exp of resume.experience) {
          addNewPageIfNeeded(60);

          // Title - bold
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.text(exp.title, marginLeft, yPosition);

          // Dates - right aligned
          pdf.setFont('helvetica', 'normal');
          const expDates = `${exp.startDate} to ${exp.endDate}`;
          const expDatesWidth = pdf.getTextWidth(expDates);
          pdf.text(expDates, pageWidth - marginRight - expDatesWidth, yPosition);
          yPosition += 12;

          // Company and location
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          const companyLine = `${exp.company}${exp.location ? `, ${exp.location}` : ''}`;
          pdf.text(companyLine, marginLeft, yPosition);
          yPosition += 12;

          // Bullets
          for (const bullet of exp.bullets.filter(b => b.enabled)) {
            addNewPageIfNeeded(20);
            pdf.setFontSize(9);
            const bulletText = `• ${bullet.text}`;
            const lines = pdf.splitTextToSize(bulletText, contentWidth - 10);
            for (let i = 0; i < lines.length; i++) {
              pdf.text(lines[i], marginLeft + (i === 0 ? 0 : 10), yPosition);
              yPosition += 11;
            }
          }
          yPosition += 6;
        }
      }

      // === LEADERSHIP EXPERIENCE SECTION ===
      if (resume.leadership.length > 0) {
        addNewPageIfNeeded(50);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('LEADERSHIP EXPERIENCE', marginLeft, yPosition);
        yPosition += 2;
        drawLine(yPosition);
        yPosition += 12;

        for (const lead of resume.leadership) {
          addNewPageIfNeeded(60);

          // Title - bold
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.text(lead.title, marginLeft, yPosition);

          // Dates - right aligned
          pdf.setFont('helvetica', 'normal');
          const leadDates = `${lead.startDate} to ${lead.endDate}`;
          const leadDatesWidth = pdf.getTextWidth(leadDates);
          pdf.text(leadDates, pageWidth - marginRight - leadDatesWidth, yPosition);
          yPosition += 12;

          // Organization and location
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          const orgLine = `${lead.organization}${lead.location ? `, ${lead.location}` : ''}`;
          pdf.text(orgLine, marginLeft, yPosition);
          yPosition += 12;

          // Bullets
          for (const bullet of lead.bullets.filter(b => b.enabled)) {
            addNewPageIfNeeded(20);
            pdf.setFontSize(9);
            const bulletText = `• ${bullet.text}`;
            const lines = pdf.splitTextToSize(bulletText, contentWidth - 10);
            for (let i = 0; i < lines.length; i++) {
              pdf.text(lines[i], marginLeft + (i === 0 ? 0 : 10), yPosition);
              yPosition += 11;
            }
          }
          yPosition += 6;
        }
      }

      // === PROJECTS SECTION ===
      if (resume.projects.length > 0) {
        addNewPageIfNeeded(50);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(FONT_SIZE.sectionHeader);
        pdf.text('ACADEMIC PROJECTS', marginLeft, yPosition);
        yPosition += 2;
        drawLine(yPosition);
        yPosition += SPACING.afterSectionHeader;

        for (const proj of resume.projects) {
          addNewPageIfNeeded(40);

          // Project name - bold, with dates right-aligned
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(FONT_SIZE.roleTitle);
          pdf.text(proj.name, marginLeft, yPosition);
          
          // Dates - right aligned (if available)
          if (proj.startDate || proj.endDate) {
            pdf.setFont('helvetica', 'normal');
            const dateText = `${proj.startDate || ''} to ${proj.endDate || ''}`;
            const dateWidth = pdf.getTextWidth(dateText);
            pdf.text(dateText, pageWidth - marginRight - dateWidth, yPosition);
          }
          yPosition += SPACING.afterRoleLine;
          
          // URL link on second line if available
          if (proj.link) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(FONT_SIZE.body);
            pdf.setTextColor(0, 0, 139); // Dark blue for link
            pdf.textWithLink(proj.link, marginLeft, yPosition, { url: proj.link });
            pdf.setTextColor(0, 0, 0); // Reset to black
            yPosition += SPACING.afterOrgLine;
          }

          // Bullets - solid round bullets with hanging indent
          for (const bullet of proj.bullets.filter(b => b.enabled)) {
            addNewPageIfNeeded(20);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(FONT_SIZE.body);
            const bulletText = `• ${bullet.text}`;
            const lines = pdf.splitTextToSize(bulletText, contentWidth - bulletIndent);
            for (let i = 0; i < lines.length; i++) {
              pdf.text(lines[i], marginLeft + (i === 0 ? 0 : bulletIndent), yPosition);
              yPosition += SPACING.bulletLine;
            }
          }
          yPosition += SPACING.betweenEntries;
        }
        yPosition += SPACING.betweenEntries;
      }

      // === SKILLS SECTION ===
      const allSkills = [
        ...resume.skills.technical,
        ...resume.skills.tools,
        ...resume.skills.certifications,
      ].filter(Boolean);

      if (allSkills.length > 0) {
        addNewPageIfNeeded(30);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('SKILLS', marginLeft, yPosition);
        yPosition += 2;
        drawLine(yPosition);
        yPosition += 12;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        const skillsText = allSkills.join(', ');
        const skillLines = pdf.splitTextToSize(skillsText, contentWidth);
        for (const line of skillLines) {
          pdf.text(line, marginLeft, yPosition);
          yPosition += 11;
        }
        yPosition += 6;
      }

      // === LANGUAGES SECTION ===
      if (resume.skills.languages.length > 0) {
        addNewPageIfNeeded(30);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('LANGUAGES', marginLeft, yPosition);
        yPosition += 2;
        drawLine(yPosition);
        yPosition += 12;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text(resume.skills.languages.join(', '), marginLeft, yPosition);
        yPosition += 16;
      }

    } else {
      // Fallback: render plain text resume
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(`Resume - ${content.roleName}`, marginLeft, yPosition);
      yPosition += 14;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(content.companyName, marginLeft, yPosition);
      yPosition += 20;

      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(content.resume, contentWidth);
      for (const line of lines) {
        addNewPageIfNeeded(14);
        pdf.text(line, marginLeft, yPosition);
        yPosition += 12;
      }
    }
  }

  if (type === 'both' && content.coverLetter) {
    pdf.addPage();
    yPosition = marginTop;
  }

  if ((type === 'coverLetter' || type === 'both') && content.coverLetter) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Cover Letter', marginLeft, yPosition);
    yPosition += 24;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const paragraphs = content.coverLetter.split('\n');
    for (const para of paragraphs) {
      if (para.trim()) {
        const lines = pdf.splitTextToSize(para.trim(), contentWidth);
        for (const line of lines) {
          addNewPageIfNeeded(14);
          pdf.text(line, marginLeft, yPosition);
          yPosition += 13;
        }
        yPosition += 8;
      }
    }
  }

  const fileName = type === 'resume' 
    ? `Resume_${content.companyName.replace(/\s+/g, '_')}.pdf`
    : type === 'coverLetter'
    ? `CoverLetter_${content.companyName.replace(/\s+/g, '_')}.pdf`
    : `Application_${content.companyName.replace(/\s+/g, '_')}.pdf`;

  pdf.save(fileName);
}

// Professional DOCX export matching the reference format
export async function exportToDocx(content: ExportContent, type: 'resume' | 'coverLetter' | 'both') {
  const children: Paragraph[] = [];

  if ((type === 'resume' || type === 'both') && content.masterResume) {
    const resume = content.masterResume;

    // Header - Name centered
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resume.header.name || 'Your Name',
            bold: true,
            size: 32,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      })
    );

    // Contact info centered
    const contactParts = [
      resume.header.location,
      resume.header.phone,
      resume.header.email,
      resume.header.linkedin,
    ].filter(Boolean);
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join(' | '),
            size: 18,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Helper function for section headers
    const addSectionHeader = (title: string) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 22,
            }),
          ],
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: '000000',
            },
          },
          spacing: { before: 200, after: 120 },
        })
      );
    };

    // Education
    if (resume.education.length > 0) {
      addSectionHeader('EDUCATION');
      
      for (const edu of resume.education) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`,
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: `\t${edu.graduationDate}`,
                size: 20,
              }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(6.5) }],
            spacing: { after: 40 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${edu.school}${edu.location ? `, ${edu.location}` : ''}`,
                size: 20,
              }),
            ],
            spacing: { after: 80 },
          })
        );

        for (const bullet of edu.bullets.filter(b => b.enabled)) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: bullet.text, size: 18 })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          );
        }
      }
    }

    // Work Experience
    if (resume.experience.length > 0) {
      addSectionHeader('WORK EXPERIENCE');

      for (const exp of resume.experience) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.title,
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: `\t${exp.startDate} to ${exp.endDate}`,
                size: 20,
              }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(6.5) }],
            spacing: { after: 40 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${exp.company}${exp.location ? `, ${exp.location}` : ''}`,
                size: 20,
              }),
            ],
            spacing: { after: 80 },
          })
        );

        for (const bullet of exp.bullets.filter(b => b.enabled)) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: bullet.text, size: 18 })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          );
        }
      }
    }

    // Leadership
    if (resume.leadership.length > 0) {
      addSectionHeader('LEADERSHIP EXPERIENCE');

      for (const lead of resume.leadership) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: lead.title,
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: `\t${lead.startDate} to ${lead.endDate}`,
                size: 20,
              }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(6.5) }],
            spacing: { after: 40 },
          })
        );

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${lead.organization}${lead.location ? `, ${lead.location}` : ''}`,
                size: 20,
              }),
            ],
            spacing: { after: 80 },
          })
        );

        for (const bullet of lead.bullets.filter(b => b.enabled)) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: bullet.text, size: 18 })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          );
        }
      }
    }

    // Projects
    if (resume.projects.length > 0) {
      addSectionHeader('ACADEMIC PROJECTS');

      for (const proj of resume.projects) {
        // Project name with dates right-aligned
        const projectNameRuns: TextRun[] = [
          new TextRun({
            text: proj.name,
            bold: true,
            size: 20,
          }),
        ];
        
        // Add dates on the same line (right-aligned via tab)
        if (proj.startDate || proj.endDate) {
          projectNameRuns.push(
            new TextRun({
              text: `\t${proj.startDate || ''} to ${proj.endDate || ''}`,
              size: 20,
            })
          );
        }

        children.push(
          new Paragraph({
            children: projectNameRuns,
            tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(6.5) }],
            spacing: { after: 40 },
          })
        );

        // URL link if available
        if (proj.link) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: proj.link,
                  size: 18,
                  color: '0000AA',
                  underline: {},
                }),
              ],
              spacing: { after: 40 },
            })
          );
        }

        // Bullets
        for (const bullet of proj.bullets.filter(b => b.enabled)) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: bullet.text, size: 18 })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          );
        }
      }
    }

    // Skills
    const allSkills = [
      ...resume.skills.technical,
      ...resume.skills.tools,
      ...resume.skills.certifications,
    ].filter(Boolean);

    if (allSkills.length > 0) {
      addSectionHeader('SKILLS');
      children.push(
        new Paragraph({
          children: [new TextRun({ text: allSkills.join(', '), size: 18 })],
          spacing: { after: 80 },
        })
      );
    }

    // Languages
    if (resume.skills.languages.length > 0) {
      addSectionHeader('LANGUAGES');
      children.push(
        new Paragraph({
          children: [new TextRun({ text: resume.skills.languages.join(', '), size: 18 })],
          spacing: { after: 80 },
        })
      );
    }

  } else if (type === 'resume' || type === 'both') {
    // Fallback plain text
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `Resume - ${content.roleName}`, bold: true, size: 28 })],
        spacing: { after: 120 },
      })
    );

    for (const line of content.resume.split('\n')) {
      if (line.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 20 })],
            spacing: { after: 60 },
          })
        );
      }
    }
  }

  if (type === 'both' && content.coverLetter) {
    children.push(new Paragraph({ children: [], pageBreakBefore: true }));
  }

  if ((type === 'coverLetter' || type === 'both') && content.coverLetter) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Cover Letter', bold: true, size: 28 })],
        spacing: { after: 200 },
      })
    );

    for (const para of content.coverLetter.split('\n')) {
      if (para.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: para.trim(), size: 22 })],
            spacing: { after: 120 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.5),
            bottom: convertInchesToTwip(0.5),
            left: convertInchesToTwip(0.75),
            right: convertInchesToTwip(0.75),
          },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  
  const fileName = type === 'resume' 
    ? `Resume_${content.companyName.replace(/\s+/g, '_')}.docx`
    : type === 'coverLetter'
    ? `CoverLetter_${content.companyName.replace(/\s+/g, '_')}.docx`
    : `Application_${content.companyName.replace(/\s+/g, '_')}.docx`;

  saveAs(blob, fileName);
}

export function exportToText(content: ExportContent, type: 'resume' | 'coverLetter' | 'both') {
  let text = '';

  if ((type === 'resume' || type === 'both') && content.masterResume) {
    const resume = content.masterResume;

    text += `${resume.header.name}\n`;
    const contactParts = [
      resume.header.location,
      resume.header.phone,
      resume.header.email,
      resume.header.linkedin,
    ].filter(Boolean);
    text += contactParts.join(' | ') + '\n\n';

    if (resume.education.length > 0) {
      text += 'EDUCATION\n';
      text += '─'.repeat(50) + '\n';
      for (const edu of resume.education) {
        text += `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}\t${edu.graduationDate}\n`;
        text += `${edu.school}${edu.location ? `, ${edu.location}` : ''}\n`;
        for (const b of edu.bullets.filter(x => x.enabled)) {
          text += `• ${b.text}\n`;
        }
        text += '\n';
      }
    }

    if (resume.experience.length > 0) {
      text += 'WORK EXPERIENCE\n';
      text += '─'.repeat(50) + '\n';
      for (const exp of resume.experience) {
        text += `${exp.title}\t${exp.startDate} to ${exp.endDate}\n`;
        text += `${exp.company}${exp.location ? `, ${exp.location}` : ''}\n`;
        for (const b of exp.bullets.filter(x => x.enabled)) {
          text += `• ${b.text}\n`;
        }
        text += '\n';
      }
    }

    if (resume.leadership.length > 0) {
      text += 'LEADERSHIP EXPERIENCE\n';
      text += '─'.repeat(50) + '\n';
      for (const lead of resume.leadership) {
        text += `${lead.title}\t${lead.startDate} to ${lead.endDate}\n`;
        text += `${lead.organization}${lead.location ? `, ${lead.location}` : ''}\n`;
        for (const b of lead.bullets.filter(x => x.enabled)) {
          text += `• ${b.text}\n`;
        }
        text += '\n';
      }
    }

    if (resume.projects.length > 0) {
      text += 'ACADEMIC PROJECTS\n';
      text += '─'.repeat(50) + '\n';
      for (const proj of resume.projects) {
        const dateText = (proj.startDate || proj.endDate) 
          ? `\t${proj.startDate || ''} to ${proj.endDate || ''}` 
          : '';
        text += `${proj.name}${dateText}\n`;
        if (proj.link) {
          text += `${proj.link}\n`;
        }
        for (const b of proj.bullets.filter(x => x.enabled)) {
          text += `• ${b.text}\n`;
        }
        text += '\n';
      }
    }

    const allSkills = [...resume.skills.technical, ...resume.skills.tools, ...resume.skills.certifications].filter(Boolean);
    if (allSkills.length > 0) {
      text += 'SKILLS\n';
      text += '─'.repeat(50) + '\n';
      text += allSkills.join(', ') + '\n\n';
    }

    if (resume.skills.languages.length > 0) {
      text += 'LANGUAGES\n';
      text += '─'.repeat(50) + '\n';
      text += resume.skills.languages.join(', ') + '\n';
    }

  } else if (type === 'resume' || type === 'both') {
    text += `RESUME - ${content.roleName}\n`;
    text += `${content.companyName}\n`;
    text += '='.repeat(50) + '\n\n';
    text += content.resume + '\n';
  }

  if (type === 'both' && content.coverLetter) {
    text += '\n' + '='.repeat(50) + '\n\n';
  }

  if ((type === 'coverLetter' || type === 'both') && content.coverLetter) {
    text += 'COVER LETTER\n';
    text += '='.repeat(50) + '\n\n';
    text += content.coverLetter + '\n';
  }

  const fileName = type === 'resume' 
    ? `Resume_${content.companyName.replace(/\s+/g, '_')}.txt`
    : type === 'coverLetter'
    ? `CoverLetter_${content.companyName.replace(/\s+/g, '_')}.txt`
    : `Application_${content.companyName.replace(/\s+/g, '_')}.txt`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, fileName);
}
