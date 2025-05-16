import os
import base64
from io import BytesIO
import barcode
from barcode.writer import ImageWriter
from django.conf import settings
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image as PILImage
import qrcode

class IDCardGenerator:
    @staticmethod
    def generate_barcode(member_id):
        """Generate a barcode image from member ID and return base64 encoded string"""
        try:
            # Create a barcode object (Code128 is a good choice for alphanumeric IDs)
            code128 = barcode.get_barcode_class('code128')
            
            # Generate the barcode to a BytesIO object
            barcode_io = BytesIO()
            barcode_instance = code128(str(member_id), writer=ImageWriter())
            
            # Write to the BytesIO object
            barcode_instance.write(barcode_io, {
                'write_text': False,  # Don't write the text below the barcode
                'quiet_zone': 2.5,   # Add some padding
                'module_width': 0.2,  # Make barcode thinner
                'module_height': 15.0,  # Make barcode taller
                'font_size': 0,  # Hide text
            })
            
            # Reset the buffer position to the beginning
            barcode_io.seek(0)
            
            # Encode the image as base64
            barcode_base64 = base64.b64encode(barcode_io.read()).decode('utf-8')
            
            return barcode_base64
            
        except Exception as e:
            print(f"Error generating barcode: {str(e)}")
            # Return a transparent 1x1 pixel as fallback
            return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    
    @staticmethod
    def generate_id_card_pdf(member):
        """Generate a PDF ID card for the given member using reportlab"""
        try:
            # Create a BytesIO buffer for the PDF
            buffer = BytesIO()
            
            # Create the PDF object, using the BytesIO object as its "file."
            p = canvas.Canvas(buffer, pagesize=(216, 136))  # 3.6x2.1 inches (86x54mm standard ID card size)
            
            # Set up the ID card dimensions
            width, height = 216, 136
            
            # Draw background
            p.setFillColorRGB(0.9, 0.9, 0.9)  # Light gray background
            p.rect(0, 0, width, height, fill=1, stroke=0)
            
            # Draw header
            p.setFillColorRGB(0.1, 0.14, 0.49)  # Dark blue
            p.rect(0, height - 30, width, 30, fill=1, stroke=0)
            p.setFillColorRGB(1, 1, 1)  # White text
            p.setFont("Helvetica-Bold", 12)
            p.drawCentredString(width/2, height - 22, "AV GYM MEMBER CARD")
            
            # Draw photo area
            photo_x, photo_y = 10, height - 100
            photo_size = 70
            
            # Draw photo border
            p.setFillColorRGB(1, 1, 1)  # White background
            p.rect(photo_x, photo_y, photo_size, photo_size, fill=1, stroke=1)
            
            # Add member photo or placeholder
            try:
                if member.image and hasattr(member.image, 'path') and os.path.exists(member.image.path):
                    img = PILImage.open(member.image.path)
                else:
                    img = PILImage.open(os.path.join(settings.STATIC_ROOT, 'img', 'placeholder.png'))
                
                # Resize image to fit in the photo area
                img.thumbnail((photo_size - 4, photo_size - 4), PILImage.Resampling.LANCZOS)
                
                # Save resized image to a temporary file
                temp_img = BytesIO()
                img.save(temp_img, format='PNG')
                temp_img.seek(0)
                
                # Draw the image
                p.drawImage(ImageReader(temp_img), photo_x + 2, photo_y + 2, 
                          width=photo_size - 4, height=photo_size - 4, 
                          mask='auto')
            except Exception as e:
                print(f"Error loading image: {str(e)}")
                p.setFont("Helvetica", 8)
                p.setFillColorRGB(0.5, 0.5, 0.5)
                p.drawCentredString(photo_x + photo_size/2, photo_y + photo_size/2, "NO PHOTO")
            
            # Draw member info
            info_x = photo_x + photo_size + 10
            info_y = height - 40
            
            p.setFont("Helvetica-Bold", 8)
            p.setFillColorRGB(0, 0, 0)  # Black text
            
            # Member name
            p.drawString(info_x, info_y, "NAME:")
            p.setFont("Helvetica", 8)
            p.drawString(info_x + 25, info_y, f"{member.full_name.upper()}")
            
            # Member ID
            p.setFont("Helvetica-Bold", 8)
            p.drawString(info_x, info_y - 15, "ID:")
            p.setFont("Courier", 8)
            p.drawString(info_x + 15, info_y - 15, f"{member.id}")
            
            # Dates
            current_date = timezone.now().strftime('%Y-%m-%d')
            expiry_date = (timezone.now() + timezone.timedelta(days=365)).strftime('%Y-%m-%d')
            
            p.setFont("Helvetica", 6)
            p.drawString(info_x, info_y - 30, f"Issued: {current_date}")
            p.drawString(info_x + 80, info_y - 30, f"Expires: {expiry_date}")
            
            # Generate and draw barcode
            try:
                barcode_img = IDCardGenerator.generate_barcode_image(member.id)
                if barcode_img:
                    barcode_reader = ImageReader(barcode_img)
                    barcode_width = 100
                    barcode_height = 20
                    p.drawImage(barcode_reader, info_x, info_y - 60, 
                              width=barcode_width, height=barcode_height)
            except Exception as e:
                print(f"Error drawing barcode: {str(e)}")
            
            # Draw footer
            p.setFillColorRGB(0.1, 0.14, 0.49)  # Dark blue
            p.rect(0, 0, width, 15, fill=1, stroke=0)
            p.setFillColorRGB(1, 1, 1)  # White text
            p.setFont("Helvetica", 4)
            p.drawCentredString(width/2, 5, "IF FOUND, PLEASE RETURN TO AV GYM • 123 GYM STREET, WORKOUT CITY • (123) 456-7890")
            
            # Save the PDF
            p.showPage()
            p.save()
            
            # Get the value of the BytesIO buffer and return it
            pdf = buffer.getvalue()
            buffer.close()
            return pdf
            
        except Exception as e:
            raise Exception(f"Error generating ID card: {str(e)}")
    
    @staticmethod
    def generate_barcode_image(member_id):
        """Generate a barcode image and return it as a BytesIO object"""
        try:
            # Create a barcode object (Code128 is a good choice for alphanumeric IDs)
            code128 = barcode.get_barcode_class('code128')
            
            # Generate the barcode to a BytesIO object
            barcode_io = BytesIO()
            barcode_instance = code128(str(member_id), writer=ImageWriter())
            
            # Write to the BytesIO object
            barcode_instance.write(barcode_io, {
                'write_text': False,  # Don't write the text below the barcode
                'quiet_zone': 2.5,   # Add some padding
                'module_width': 0.2,  # Make barcode thinner
                'module_height': 15.0,  # Make barcode taller
                'font_size': 0,  # Hide text
            })
            
            # Reset the buffer position to the beginning
            barcode_io.seek(0)
            return barcode_io
            
        except Exception as e:
            print(f"Error generating barcode: {str(e)}")
            return None
