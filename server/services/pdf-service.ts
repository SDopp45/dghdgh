import { PDFDocument, PDFForm, PDFCheckBox, PDFTextField, PDFRadioGroup } from 'pdf-lib';
import * as fsPromises from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';

interface PDFFormField {
  name: string;
  value: string | boolean;
  type: 'text' | 'checkbox' | 'radio' | 'select';
}

export class PDFService {
  async fillPDFForm(filePath: string, formData: Record<string, any>): Promise<Buffer> {
    try {
      logger.info('Reading PDF file for form filling', { 
        filePath,
        formDataFields: Object.keys(formData)
      });
      const pdfBytes = await fsPromises.readFile(filePath);

      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes, { 
        ignoreEncryption: true 
      });

      // Get the form
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      logger.info('Processing form fields', { 
        availableFields: fields.map(f => f.getName()),
        providedData: Object.keys(formData)
      });

      // Fill each form field
      for (const field of fields) {
        const fieldName = field.getName();
        const value = formData[fieldName];

        if (value !== undefined) {
          try {
            if (field instanceof PDFTextField) {
              field.setText(String(value));
              logger.info(`Updated text field: ${fieldName}`, { value });
            } 
            else if (field instanceof PDFCheckBox) {
              if (value === true || value === 'true') {
                field.check();
              } else {
                field.uncheck();
              }
              logger.info(`Updated checkbox field: ${fieldName}`, { value });
            }
            else if (field instanceof PDFRadioGroup) {
              field.select(String(value));
              logger.info(`Updated radio field: ${fieldName}`, { value });
            }
            else {
              logger.warn(`Unsupported field type for ${fieldName}:`, { type: field.constructor.name });
            }
          } catch (error) {
            logger.error(`Error filling field ${fieldName}:`, error);
          }
        } else {
          logger.debug(`No value provided for field: ${fieldName}`);
        }
      }

      // Flatten the form to make it non-editable
      form.flatten();

      // Save the document
      const filledPdfBytes = await pdfDoc.save({
        useObjectStreams: false,
      });

      logger.info('PDF form filled successfully', { 
        originalSize: pdfBytes.length,
        newSize: filledPdfBytes.length,
        fieldsProcessed: fields.length
      });

      return Buffer.from(filledPdfBytes);
    } catch (error) {
      logger.error('Error filling PDF form:', error);
      throw new Error('Failed to fill PDF form');
    }
  }

  async extractFormFields(filePath: string): Promise<PDFFormField[]> {
    try {
      const pdfBytes = await fsPromises.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true
      });
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      const formFields: PDFFormField[] = [];

      logger.info(`Extracting form fields from ${filePath}`, { 
        fieldCount: fields.length 
      });

      for (const field of fields) {
        const name = field.getName();
        let type: PDFFormField['type'] = 'text';
        let value: string | boolean = '';

        try {
          if (field instanceof PDFCheckBox) {
            type = 'checkbox';
            value = field.isChecked();
          } 
          else if (field instanceof PDFTextField) {
            type = 'text';
            value = field.getText() || '';
          }
          else if (field instanceof PDFRadioGroup) {
            type = 'radio';
            value = field.getSelected() || '';
          }

          formFields.push({ name, type, value });
          logger.info(`Extracted field: ${name}`, { type, value });
        } catch (error) {
          logger.error(`Error extracting field ${name}:`, error);
        }
      }

      return formFields;
    } catch (error) {
      logger.error('Error extracting form fields:', error);
      throw new Error('Failed to extract form fields');
    }
  }

  async savePDF(pdfBuffer: Buffer, filename: string): Promise<string> {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
      await fsPromises.mkdir(uploadsDir, { recursive: true });

      // Create a safe and unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 15);
      const safeName = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const uniqueName = `filled_${safeName}-${timestamp}-${randomSuffix}.pdf`;
      const filePath = path.join(uploadsDir, uniqueName);

      logger.info('Saving filled PDF', { 
        path: filePath,
        size: pdfBuffer.length 
      });

      await fsPromises.writeFile(filePath, pdfBuffer);
      return uniqueName;
    } catch (error) {
      logger.error('Error saving PDF:', error);
      throw new Error('Failed to save PDF');
    }
  }
}

export const pdfService = new PDFService();