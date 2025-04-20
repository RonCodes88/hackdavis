import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch
from cerebras.cloud.sdk import Cerebras

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
            name='Heading1',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.darkblue
        ))
        self.styles.add(ParagraphStyle(
            name='Heading2',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.darkblue
        ))
        self.styles.add(ParagraphStyle(
            name='Normal',
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
            self.styles['Heading1']
        ))
        self.elements.append(Spacer(1, 12))
        self.elements.append(Paragraph(
            f"<i>Medical History Report - Generated on {datetime.now().strftime('%B %d, %Y')}</i>",
            self.styles['Normal']
        ))
        self.elements.append(Spacer(1, 20))
    
    def add_patient_info(self, patient_data):
        """Add basic patient information section"""
        self.elements.append(Paragraph("Patient Information", self.styles['Heading2']))
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
        self.elements.append(Paragraph(title, self.styles['Heading2']))
        self.elements.append(Spacer(1, 10))
        
        if isinstance(content, str):
            self.elements.append(Paragraph(content, self.styles['Normal']))
        elif isinstance(content, list):
            for item in content:
                bullet_text = f"• {item}"
                self.elements.append(Paragraph(bullet_text, self.styles['Normal']))
                self.elements.append(Spacer(1, 5))
        
        self.elements.append(Spacer(1, 15))
    
    def generate_pdf(self):
        """Build and save the PDF document"""
        self.doc.build(self.elements)
        return self.output_path
    
    def process_with_cerebras(self, patient_data, section):
        """Process specific section data with Cerebras AI for enhancements or suggestions"""
        try:
            client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"))
            
            # Example: Using Cerebras to analyze medication interactions
            if section == "medications":
                meds_str = ", ".join(patient_data.get("medications", []))
                prompt = f"Review these medications for potential interactions: {meds_str}"
                
                chat_completion = client.chat.completions.create(
                    model="llama3.1-8b",
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                )
                
                return chat_completion.choices[0].message.content
            
            return None
        except Exception as e:
            print(f"Error using Cerebras API: {e}")
            return None


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
    
    # Medications with optional AI analysis
    pdf.add_section("Medications", patient_data.get('medications', []))
    ai_med_analysis = pdf.process_with_cerebras(patient_data, "medications")
    if ai_med_analysis:
        pdf.add_section("Medication Analysis", ai_med_analysis)
    
    pdf.add_section("Allergies", patient_data.get('allergies', []))
    pdf.add_section("Family Medical History", patient_data.get('family_history', ''))
    pdf.add_section("Social History", patient_data.get('social_history', ''))
    pdf.add_section("Immunization History", patient_data.get('immunization_history', []))
    pdf.add_section("Review of Systems", patient_data.get('review_of_systems', ''))
    
    # Generate the PDF file
    return pdf.generate_pdf()


if __name__ == "__main__":
    # Example usage
    sample_patient = {
        "clinic_name": "Comprehensive Health Clinic",
        "first_name": "John",
        "last_name": "Doe",
        "dob": "01/15/1975",
        "gender": "Male",
        "mrn": "MRN12345678",
        "phone": "(555) 123-4567",
        "email": "john.doe@email.com",
        "chief_complaint": "Persistent cough for 2 weeks with mild fever.",
        "present_illness": "Patient reports developing a dry cough approximately 2 weeks ago, which has since become productive with clear sputum. Low-grade fever (99.5°F-100.2°F) intermittently present. No chest pain or shortness of breath. Patient has been taking over-the-counter cough suppressants with minimal relief.",
        "past_medical_history": [
            "Hypertension (diagnosed 2015)",
            "Type 2 Diabetes (diagnosed 2018)",
            "Appendectomy (2010)"
        ],
        "medications": [
            "Lisinopril 10mg daily",
            "Metformin 500mg twice daily",
            "Aspirin 81mg daily",
            "Multivitamin once daily"
        ],
        "allergies": [
            "Penicillin (hives)",
            "Sulfa drugs (rash)"
        ],
        "family_history": "Father: Hypertension, died at 72 from stroke. Mother: Type 2 diabetes, alive at 68. Brother: Asthma.",
        "social_history": "Married with 2 children. Works as an accountant. Former smoker (quit 5 years ago, 10 pack-year history). Social alcohol use (2-3 drinks per week). Exercises 2-3 times weekly.",
        "immunization_history": [
            "Influenza vaccine (10/2024)",
            "Tdap (2020)",
            "Pneumococcal vaccine (2022)",
            "COVID-19 vaccine series completed (2021) with booster (2024)"
        ],
        "review_of_systems": "General: Reports fatigue but no weight loss or night sweats. Respiratory: Cough, no shortness of breath or chest pain. Cardiovascular: No palpitations or edema. Gastrointestinal: No nausea, vomiting, or changes in bowel habits. Neurological: No headaches or dizziness. Musculoskeletal: No joint pain or swelling."
    }
    
    output_file = create_medical_history_pdf(sample_patient, logo_path="hospital_logo.jpg")
    print(f"Medical history PDF generated: {output_file}")