"""
Printable 1:1 Scale PDF Generator Service (app/services/pdf_generator.py)
-------------------------------------------------------------------------
Generates physically calibrated 1:1 scale A4 PDFs for Perler & Fuse Bead crafting.
Features:
1. Exact 1:1 millimeter pitch (5.0mm for Midi, 2.6mm for Mini) for direct acrylic pegboard overlay.
2. Intelligent Page Fitting: Patterns that fit on a single A4 page (up to ~36x46 beads for Midi)
   are rendered on a SINGLE page without slicing!
3. Multi-page modular tiling ONLY when pattern is physically larger than A4.
4. Vertical & horizontal precision centering on every page.
5. Calibration verification card with 5.0 cm test ruler and zero text collision.
6. Vector bead donuts with center pinholes and high-contrast symbols.
7. Modular pegboard crimson seam lines (14.5 x 14.5 cm / 29x29 pinos).
8. Comprehensive Shopping List & Production Sheet with official brand codes.
"""

import io
import math
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white

from app.core.brands import get_brand_data


def generate_bead_pdf(
    matrix: List[List[str]],
    grid: Dict[str, Any],
    color_counts: List[Dict[str, Any]],
    brand_id: str = "perler",
    pegboard_size_cm: float = 14.5
) -> io.BytesIO:
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4  # 210mm x 297mm

    brand_data = get_brand_data(brand_id)
    cols = grid.get("columns", len(matrix[0]) if matrix else 0)
    rows = grid.get("rows", len(matrix))
    bead_size_cm = float(grid.get("bead_size_cm", 0.5))
    pitch = bead_size_cm * 10 * mm  # Exactly 5.0mm (Midi) or 2.6mm (Mini)
    bead_r = pitch * 0.44
    hole_r = pitch * 0.16

    # Build symbol map
    symbols = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#*+@&$%?!"
    color_symbol_map = {}
    for idx, item in enumerate(color_counts):
        color_symbol_map[item["hex"].upper()] = symbols[idx % len(symbols)]

    # Printable area on A4 leaving safe margins
    # Left/Right margins: 12mm -> max width = 210 - 24 = 186mm
    # Header takes 36mm, footer takes 18mm -> max height = 297 - 54 = 243mm
    max_printable_w = 186 * mm
    max_printable_h = 240 * mm

    total_w = cols * pitch
    total_h = rows * pitch

    # INTELLIGENT PAGE FITTING:
    # If the total pattern fits within an A4 sheet, DO NOT SLICE IT!
    # Render the entire pattern on a single page.
    if total_w <= max_printable_w and total_h <= max_printable_h:
        beads_per_page_x = cols
        beads_per_page_y = rows
    else:
        # Truly multi-page! Use pegboard modular tile size (e.g. 29x29) or page max
        beads_per_page_x = min(cols, max(1, int(max_printable_w // pitch)))
        beads_per_page_y = min(rows, max(1, int(max_printable_h // pitch)))
        if pegboard_size_cm > 0:
            beads_per_board = int(round(pegboard_size_cm / bead_size_cm))
            if (beads_per_board * pitch) <= max_printable_w and (beads_per_board * pitch) <= max_printable_h:
                beads_per_page_x = beads_per_board
                beads_per_page_y = beads_per_board

    num_tiles_x = math.ceil(cols / beads_per_page_x)
    num_tiles_y = math.ceil(rows / beads_per_page_y)
    total_pattern_pages = num_tiles_x * num_tiles_y

    current_page = 1

    # ----------------------------------------------------
    # RENDER PATTERN PAGES (1:1 Exact Physical Scale)
    # ----------------------------------------------------
    for ty in range(num_tiles_y):
        for tx in range(num_tiles_x):
            start_col = tx * beads_per_page_x
            end_col = min(cols, (tx + 1) * beads_per_page_x)
            start_row = ty * beads_per_page_y
            end_row = min(rows, (ty + 1) * beads_per_page_y)

            tile_cols = end_col - start_col
            tile_rows = end_row - start_row
            tile_w = tile_cols * pitch
            tile_h = tile_rows * pitch

            # Precision vertical and horizontal centering
            header_bottom = page_h - 36 * mm
            footer_top = 20 * mm
            usable_h = header_bottom - footer_top

            margin_x = (page_w - tile_w) / 2
            margin_y = footer_top + (usable_h - tile_h) / 2

            # ------------------------------------------------
            # HEADER (Left side)
            # ------------------------------------------------
            pdf.setFont("Helvetica-Bold", 13)
            pdf.setFillColor(HexColor("#0F172A"))
            pdf.drawString(16 * mm, page_h - 14 * mm, "Perler Studio - Molde 1:1 Escala Real")

            pdf.setFont("Helvetica", 8)
            pdf.setFillColor(HexColor("#475569"))
            if total_pattern_pages > 1:
                board_label = f"Placa [{tx+1},{ty+1}] de [{num_tiles_x},{num_tiles_y}]  •  Colunas {start_col+1} a {end_col}, Linhas {start_row+1} a {end_row}"
            else:
                board_label = "Molde Completo (Encaixe as placas sobre a folha)"

            dim_w_cm = tile_w / 10 / mm
            dim_h_cm = tile_h / 10 / mm
            pdf.drawString(
                16 * mm,
                page_h - 20 * mm,
                f"{board_label}  •  {tile_cols}×{tile_rows} pinos ({dim_w_cm:.1f} × {dim_h_cm:.1f} cm)"
            )
            pdf.drawString(
                16 * mm,
                page_h - 25 * mm,
                f"Marca: {brand_data['name']}  •  Bead: {bead_size_cm*10:.1f} mm ({'Midi' if bead_size_cm >= 0.4 else 'Mini'})  •  Total: {grid.get('total_beads', 0)} miçangas"
            )

            # ------------------------------------------------
            # CALIBRATION RULER CARD (Right side, neat rounded card)
            # ------------------------------------------------
            card_w = 64 * mm
            card_h = 21 * mm
            card_x = page_w - 16 * mm - card_w
            card_y = page_h - 29 * mm

            # Card background
            pdf.setStrokeColor(HexColor("#CBD5E1"))
            pdf.setLineWidth(0.6)
            pdf.setFillColor(HexColor("#F8FAFC"))
            pdf.roundRect(card_x, card_y, card_w, card_h, 2.5 * mm, stroke=1, fill=1)

            # Card title
            pdf.setFont("Helvetica-Bold", 6.5)
            pdf.setFillColor(HexColor("#334155"))
            pdf.drawCentredString(card_x + card_w / 2, card_y + card_h - 4.5 * mm, "RÉGUA DE CALIBRAÇÃO DE ESCALA (5 CM)")

            # 50mm ruler line
            ruler_len = 50 * mm
            ruler_start_x = card_x + (card_w - ruler_len) / 2
            ruler_line_y = card_y + 6.5 * mm

            pdf.setStrokeColor(HexColor("#0F172A"))
            pdf.setLineWidth(0.8)
            pdf.line(ruler_start_x, ruler_line_y, ruler_start_x + ruler_len, ruler_line_y)

            # Centimeter ticks 0 to 5
            for tick_cm in range(6):
                tx_tick = ruler_start_x + tick_cm * 10 * mm
                is_major = tick_cm in (0, 5)
                tick_h = 3.2 * mm if is_major else 1.8 * mm
                pdf.line(tx_tick, ruler_line_y - 0.8 * mm, tx_tick, ruler_line_y + tick_h)

                pdf.setFont("Helvetica-Bold" if is_major else "Helvetica", 6)
                pdf.setFillColor(HexColor("#0F172A"))
                pdf.drawCentredString(tx_tick, ruler_line_y + tick_h + 1.2 * mm, str(tick_cm))

            # Verification subtitle
            pdf.setFont("Helvetica", 5.2)
            pdf.setFillColor(HexColor("#64748B"))
            pdf.drawCentredString(card_x + card_w / 2, card_y + 1.8 * mm, "Meça com régua real: deve medir exatamente 5,0 cm")

            # ------------------------------------------------
            # GRID BOUNDARY & PINHOLES
            # ------------------------------------------------
            pdf.setStrokeColor(HexColor("#E2E8F0"))
            pdf.setLineWidth(0.5)
            pdf.rect(margin_x, margin_y, tile_w, tile_h, stroke=1, fill=0)

            # Render beads and alignment pins
            for r_idx, r in enumerate(range(start_row, end_row)):
                y_center = margin_y + (tile_rows - 1 - r_idx) * pitch + pitch / 2

                for c_idx, c in enumerate(range(start_col, end_col)):
                    x_center = margin_x + c_idx * pitch + pitch / 2
                    hex_val = matrix[r][c] if r < len(matrix) and c < len(matrix[r]) else "TRANSPARENT"

                    if hex_val and hex_val != "TRANSPARENT":
                        try:
                            c_color = HexColor(hex_val)
                        except Exception:
                            c_color = HexColor("#808080")

                        # Bead outer ring
                        pdf.setFillColor(c_color)
                        pdf.setStrokeColor(HexColor("#334155"))
                        pdf.setLineWidth(0.4)
                        pdf.circle(x_center, y_center, bead_r, stroke=1, fill=1)

                        # Bead center peg hole
                        pdf.setFillColor(HexColor("#FFFFFF"))
                        pdf.setStrokeColor(HexColor("#CBD5E1"))
                        pdf.setLineWidth(0.2)
                        pdf.circle(x_center, y_center, hole_r, stroke=1, fill=1)

                        # Color Symbol
                        sym = color_symbol_map.get(hex_val.upper(), "")
                        if sym:
                            # Dynamic contrast calculation
                            clean_hex = hex_val.lstrip("#")
                            if len(clean_hex) == 6:
                                r_val = int(clean_hex[0:2], 16)
                                g_val = int(clean_hex[2:4], 16)
                                b_val = int(clean_hex[4:6], 16)
                                lum = (0.299 * r_val + 0.587 * g_val + 0.114 * b_val) / 255.0
                            else:
                                lum = 0.5

                            pdf.setFillColor(black if lum > 0.60 else white)
                            pdf.setFont("Helvetica-Bold", 5.5)
                            pdf.drawCentredString(x_center, y_center - 1.8, sym)
                    else:
                        # Faint alignment pinhole dot for transparent spaces
                        pdf.setFillColor(HexColor("#CBD5E1"))
                        pdf.circle(x_center, y_center, 0.45 * mm, stroke=0, fill=1)

            # ------------------------------------------------
            # MODULAR PEGBOARD SEAMS (Crimson Dashed Lines)
            # ------------------------------------------------
            if pegboard_size_cm > 0:
                beads_per_peg = int(round(pegboard_size_cm / bead_size_cm))

                # If the tile spans across pegboard boundaries, draw dashed boundary lines
                first_seam_col = beads_per_peg - (start_col % beads_per_peg)
                first_seam_row = beads_per_peg - (start_row % beads_per_peg)

                pdf.setStrokeColor(HexColor("#E11D48"))
                pdf.setLineWidth(1.0)
                pdf.setDash(4, 2)

                # Vertical seam lines
                curr_c = first_seam_col
                while curr_c < tile_cols:
                    seam_x = margin_x + curr_c * pitch
                    pdf.line(seam_x, margin_y, seam_x, margin_y + tile_h)
                    curr_c += beads_per_peg

                # Horizontal seam lines
                curr_r = first_seam_row
                while curr_r < tile_rows:
                    seam_y = margin_y + (tile_rows - curr_r) * pitch
                    pdf.line(margin_x, seam_y, margin_x + tile_w, seam_y)
                    curr_r += beads_per_peg

                pdf.setDash([])  # Reset dash

            # ------------------------------------------------
            # FOOTER (Page number & instruction)
            # ------------------------------------------------
            pdf.setFont("Helvetica", 7.5)
            pdf.setFillColor(HexColor("#64748B"))
            pdf.drawCentredString(
                page_w / 2,
                12 * mm,
                f"Página {current_page} de {total_pattern_pages + 1}  •  Imprima em 100% de escala (sem ajustar à página) e posicione a placa transparente sobre os círculos."
            )

            pdf.showPage()
            current_page += 1

    # ----------------------------------------------------
    # RENDER PAGE: SHOPPING LIST & PRODUCTION SHEET
    # ----------------------------------------------------
    pdf.setFont("Helvetica-Bold", 16)
    pdf.setFillColor(HexColor("#0F172A"))
    pdf.drawString(18 * mm, page_h - 22 * mm, "Ficha de Produção & Lista de Compras")

    # Project Summary Box
    sum_w = page_w - 36 * mm
    sum_h = 18 * mm
    sum_x = 18 * mm
    sum_y = page_h - 43 * mm

    pdf.setFillColor(HexColor("#F8FAFC"))
    pdf.setStrokeColor(HexColor("#E2E8F0"))
    pdf.setLineWidth(0.75)
    pdf.roundRect(sum_x, sum_y, sum_w, sum_h, 2 * mm, stroke=1, fill=1)

    pdf.setFont("Helvetica", 8)
    pdf.setFillColor(HexColor("#334155"))
    pdf.drawString(
        sum_x + 4 * mm,
        sum_y + 11 * mm,
        f"Marca: {brand_data['name']} ({brand_data.get('country', '')})  •  Molde: {cols} colunas × {rows} linhas ({grid.get('dimensions_cm', {}).get('width', 0):.1f} × {grid.get('dimensions_cm', {}).get('height', 0):.1f} cm)"
    )

    peg_needed = math.ceil(cols / 29) * math.ceil(rows / 29)
    pdf.drawString(
        sum_x + 4 * mm,
        sum_y + 4.5 * mm,
        f"Total de Miçangas: {grid.get('total_beads', 0)} peças  •  Cores Diferentes: {len(color_counts)}  •  Placas 29×29 Necessárias: {peg_needed}"
    )

    # Inventory Table
    y_table = sum_y - 8 * mm
    col_w = [18 * mm, 18 * mm, 24 * mm, 74 * mm, 26 * mm, 14 * mm]
    headers = ["Símbolo", "Cor", "Código", "Nome Oficial da Cor", "Quantidade", "Check"]

    # Table Header Row
    pdf.setFillColor(HexColor("#EDE9FE"))
    pdf.rect(18 * mm, y_table - 6.5 * mm, sum(col_w), 6.5 * mm, stroke=0, fill=1)

    pdf.setFont("Helvetica-Bold", 8)
    pdf.setFillColor(HexColor("#5B21B6"))
    cur_x = 18 * mm
    for idx, (h, w) in enumerate(zip(headers, col_w)):
        pdf.drawString(cur_x + 2 * mm, y_table - 4.5 * mm, h)
        cur_x += w

    # Inventory Rows
    y_row = y_table - 6.5 * mm
    pdf.setFont("Helvetica", 8)

    for r_idx, item in enumerate(color_counts):
        row_h = 6.2 * mm
        y_row -= row_h

        if y_row < 24 * mm:
            # Table pagination
            pdf.showPage()
            y_row = page_h - 26 * mm

        # Alternate light row
        if r_idx % 2 == 1:
            pdf.setFillColor(HexColor("#F8FAFC"))
            pdf.rect(18 * mm, y_row, sum(col_w), row_h, stroke=0, fill=1)

        pdf.setStrokeColor(HexColor("#E2E8F0"))
        pdf.setLineWidth(0.4)
        pdf.line(18 * mm, y_row, 18 * mm + sum(col_w), y_row)

        sym = color_symbol_map.get(item["hex"].upper(), "")
        code = item.get("code") or ""
        name = item.get("name") or "Bead"
        count_str = f"{item.get('count', 0)} pcs"

        cur_x = 18 * mm

        # 1. Símbolo badge
        pdf.setFillColor(HexColor("#334155"))
        pdf.setFont("Helvetica-Bold", 8)
        pdf.drawCentredString(cur_x + col_w[0] / 2, y_row + 1.8 * mm, sym)
        cur_x += col_w[0]

        # 2. Amostra de cor (donut circle)
        try:
            sample_col = HexColor(item["hex"])
        except Exception:
            sample_col = HexColor("#808080")

        center_sample_x = cur_x + col_w[1] / 2
        center_sample_y = y_row + row_h / 2

        pdf.setFillColor(sample_col)
        pdf.setStrokeColor(HexColor("#334155"))
        pdf.setLineWidth(0.4)
        pdf.circle(center_sample_x, center_sample_y, 2.4 * mm, stroke=1, fill=1)

        pdf.setFillColor(white)
        pdf.setStrokeColor(HexColor("#CBD5E1"))
        pdf.setLineWidth(0.2)
        pdf.circle(center_sample_x, center_sample_y, 0.8 * mm, stroke=1, fill=1)
        cur_x += col_w[1]

        # 3. Código
        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(HexColor("#0F172A"))
        pdf.drawString(cur_x + 2 * mm, y_row + 1.8 * mm, code)
        cur_x += col_w[2]

        # 4. Nome
        pdf.setFont("Helvetica", 8)
        pdf.drawString(cur_x + 2 * mm, y_row + 1.8 * mm, name[:38])
        cur_x += col_w[3]

        # 5. Quantidade
        pdf.setFont("Helvetica-Bold", 8)
        pdf.setFillColor(HexColor("#7C3AED"))
        pdf.drawString(cur_x + 2 * mm, y_row + 1.8 * mm, count_str)
        cur_x += col_w[4]

        # 6. Checkbox
        pdf.setStrokeColor(HexColor("#94A3B8"))
        pdf.setLineWidth(0.6)
        pdf.rect(cur_x + 4 * mm, y_row + 1.2 * mm, 3.8 * mm, 3.8 * mm, stroke=1, fill=0)

    # Bottom border of table
    pdf.setStrokeColor(HexColor("#CBD5E1"))
    pdf.setLineWidth(0.5)
    pdf.line(18 * mm, y_row, 18 * mm + sum(col_w), y_row)

    # Footer note
    pdf.setFont("Helvetica-Oblique", 7)
    pdf.setFillColor(HexColor("#64748B"))
    pdf.drawString(
        18 * mm,
        12 * mm,
        "Dica de Montagem: Utilize uma pinça para artesanato e papel manteiga resistente ao passar o ferro quente em movimentos circulares uniformes."
    )

    pdf.showPage()
    pdf.save()

    buffer.seek(0)
    return buffer
