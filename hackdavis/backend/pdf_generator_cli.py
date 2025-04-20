import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch
import argparse

# Create pdfs directory if it doesn't exist
PDF_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdfs")
os.makedirs(PDF_DIR, exist_ok=True)

class MedicalHistoryPDF:
    def __init__(self, output_path='patient_medical_history.pdf'):
        self.output_path = output_path
        self.doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        self.styles = getSampleStyleSheet()
        self.elements = []
        self.setup_styles()
        
    def setup_styles(self):
        """Setup custom styles for the document"""
        self.styles.add(ParagraphStyle(
            name='MedicalHeading1',  # Changed from 'Heading1'
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.darkblue
        ))
        self.styles.add(ParagraphStyle(
            name='MedicalHeading2',  # Changed from 'Heading2'
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.darkblue
        ))
        self.styles.add(ParagraphStyle(
            name='MedicalNormal',  # Changed from 'Normal'
            parent=self.styles['Normal'],
            fontSize=11
        ))
    
    def add_header(self, clinic_name, logo_path=None):
        """Add header with logo and clinic name"""
        if logo_path and os.path.exists(logo_path):
            logo = Image(logo_path, width=1.5*inch, height=0.75*inch)
            self.elements.append(logo)
        
        self.elements.append(Paragraph(
            f"<b>{clinic_name}</b>", 
            self.styles['MedicalHeading1']  # Changed from 'Heading1'
        ))
        self.elements.append(Spacer(1, 12))
        self.elements.append(Paragraph(
            f"<i>Medical History Report - Generated on {datetime.now().strftime('%B %d, %Y')}</i>",
            self.styles['MedicalNormal']  # Changed from 'Normal'
        ))
        self.elements.append(Spacer(1, 20))
    
    def add_patient_info(self, patient_data):
        """Add basic patient information section"""
        self.elements.append(Paragraph("Patient Information", self.styles['MedicalHeading2']))  # Changed from 'Heading2'
        self.elements.append(Spacer(1, 10))
        
        data = []
        for key, value in patient_data.items():
            data.append([key, value])
        
        table = Table(data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.darkblue),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOX', (0, 0), (-1, -1), 1, colors.black),
            ('LINEBELOW', (0, 0), (-1, -1), 1, colors.lightgrey),
        ]))
        self.elements.append(table)
        self.elements.append(Spacer(1, 20))
    
    def add_section(self, title, content):
        """Add a standard section with title and content"""
        self.elements.append(Paragraph(title, self.styles['MedicalHeading2']))  # Changed from 'Heading2'
        self.elements.append(Spacer(1, 10))
        
        if isinstance(content, str):
            self.elements.append(Paragraph(content, self.styles['MedicalNormal']))  # Changed from 'Normal'
        elif isinstance(content, list):
            for item in content:
                bullet_text = f"• {item}"
                self.elements.append(Paragraph(bullet_text, self.styles['MedicalNormal']))  # Changed from 'Normal'
                self.elements.append(Spacer(1, 5))
        
        self.elements.append(Spacer(1, 15))
    
    def generate_pdf(self):
        """Build and save the PDF document"""
        self.doc.build(self.elements)
        return self.output_path


def create_medical_history_pdf(patient_data, output_path="patient_medical_history.pdf", logo_path=None):
    """
    Create a complete medical history PDF.
    
    Args:
        patient_data (dict): Dictionary containing all patient information
        output_path (str): Path where to save the PDF
        logo_path (str): Optional path to clinic logo
    """
    pdf = MedicalHistoryPDF(output_path)
    
    # Add header with clinic name
    pdf.add_header(patient_data.get("clinic_name", "Medical Clinic"), logo_path)
    
    # Add patient information section
    basic_info = {
        "Name": f"{patient_data.get('first_name', '')} {patient_data.get('last_name', '')}",
        "DOB": patient_data.get('dob', ''),
        "Gender": patient_data.get('gender', ''),
        "MRN": patient_data.get('mrn', ''),
        "Contact": patient_data.get('phone', ''),
        "Email": patient_data.get('email', '')
    }
    pdf.add_patient_info(basic_info)
    
    # Add all medical history sections
    pdf.add_section("Chief Complaint", patient_data.get('chief_complaint', ''))
    pdf.add_section("History of Present Illness", patient_data.get('present_illness', ''))
    pdf.add_section("Past Medical History", patient_data.get('past_medical_history', []))
    pdf.add_section("Medications", patient_data.get('medications', []))
    pdf.add_section("Allergies", patient_data.get('allergies', []))
    pdf.add_section("Family Medical History", patient_data.get('family_history', ''))
    pdf.add_section("Social History", patient_data.get('social_history', ''))
    pdf.add_section("Immunization History", patient_data.get('immunization_history', []))
    pdf.add_section("Review of Systems", patient_data.get('review_of_systems', ''))
    
    # Generate the PDF file
    return pdf.generate_pdf()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate a medical history PDF')
    parser.add_argument('--output', type=str, default=None, help='Output file path')
    parser.add_argument('--logo', type=str, default=None, help='Path to hospital/clinic logo')
    parser.add_argument('--demo', action='store_true', help='Use sample data for quick demo')
    args = parser.parse_args()
    
    if args.demo:
        # Sample patient data for demo
        sample_patient = {
            
           
        "clinic_name": "East Bay Women’s Health",
        "first_name": "Jasmine",
        "last_name": "Ali",
        "dob": "09/12/1995",
        "gender": "Female",
        "mrn": "MRN56789012",
        "phone": "(510) 321-4567",
        "email": "jasmine.ali@gmail.com",
        "chief_complaint": "Irregular menstrual cycles and acne flare-ups.",
        "present_illness": "Reports cycles varying between 35–60 days, associated with increased facial acne and weight gain over the last year.",
        "past_medical_history": [
        "PCOS (diagnosed 2021)"
        ],
        "medications": [
        "Oral contraceptive (Ethinyl estradiol/norgestimate)",
        "Spironolactone 50mg daily"
        ],
        "allergies": [
        "Latex (skin irritation)"
        ],
        "family_history": "Mother: Hypothyroidism. Father: Obesity and high cholesterol. Younger brother: Healthy.",
        "social_history": "Single. Graduate student. No tobacco. Drinks coffee daily. No alcohol or recreational drugs. Yoga 1–2 times a week.",
        "immunization_history": [
        "HPV vaccine series completed (2014)",
        "Influenza vaccine (2024)",
        "COVID-19 vaccines up to date"
        ],
        "review_of_systems": "Endocrine: Reports acne, weight gain. GI: Normal. General: No fatigue or fever. GYN: Irregular menses."
  }
  
        
        # Generate a default filename if none is provided
        if args.output is None:
            filename = f"{sample_patient['last_name']}_{sample_patient['first_name']}_medical_history.pdf"
            output_path = os.path.join(PDF_DIR, filename)
        else:
            # If user specifies a path, still save it in the pdfs directory
            output_path = os.path.join(PDF_DIR, os.path.basename(args.output))
        
        output_file = create_medical_history_pdf(sample_patient, output_path=output_path, logo_path=args.logo)
        print(f"Demo medical history PDF generated: {output_file}")
    else:
        print("Please use the --demo flag to generate a sample PDF or implement custom data input.")