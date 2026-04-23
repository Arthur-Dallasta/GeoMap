# -*- coding: utf-8 -*-
"""Gera PDF com Diagrama ER (notação de Chen) e tabelas descritivas."""
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Ellipse, FancyBboxPatch, Polygon
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.patches as mpatches

OUTPUT = r"C:\Users\arthu\OneDrive\Desktop\Apps\GeoMap\docs\diagrama_er_geomap.pdf"

# ---------- Cores padrão (estilo referência) ----------
ENT_FACE = "#FFFFFF"
ENT_EDGE = "#1F3A6B"
REL_FACE = "#FFFFFF"
REL_EDGE = "#1F3A6B"
ATTR_FACE = "#FFFFFF"
ATTR_EDGE = "#1F3A6B"
PK_DOT = "#1F3A6B"
LINE_COLOR = "#1F3A6B"


def draw_entity(ax, x, y, w, h, label):
    rect = Rectangle((x - w / 2, y - h / 2), w, h,
                     facecolor=ENT_FACE, edgecolor=ENT_EDGE, linewidth=1.8)
    ax.add_patch(rect)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=10, fontweight="bold", color=ENT_EDGE)


def draw_relationship(ax, x, y, w, h, label):
    pts = [(x, y + h / 2), (x + w / 2, y), (x, y - h / 2), (x - w / 2, y)]
    dia = Polygon(pts, closed=True, facecolor=REL_FACE,
                  edgecolor=REL_EDGE, linewidth=1.6)
    ax.add_patch(dia)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=8.5, fontstyle="italic", color=REL_EDGE)


def draw_attribute(ax, x, y, label, pk=False, rx=0.55, ry=0.25):
    el = Ellipse((x, y), rx * 2, ry * 2, facecolor=ATTR_FACE,
                 edgecolor=ATTR_EDGE, linewidth=1.0)
    ax.add_patch(el)
    prefix = "● " if pk else ""
    ax.text(x, y, prefix + label, ha="center", va="center",
            fontsize=7, color=ATTR_EDGE,
            fontweight=("bold" if pk else "normal"))


def line(ax, x1, y1, x2, y2, card=None, card_offset=(0, 0)):
    ax.plot([x1, x2], [y1, y2], color=LINE_COLOR, linewidth=1.1, zorder=0)
    if card:
        mx, my = (x1 + x2) / 2 + card_offset[0], (y1 + y2) / 2 + card_offset[1]
        ax.text(mx, my, card, fontsize=7.5, color=ENT_EDGE,
                bbox=dict(boxstyle="round,pad=0.15",
                          facecolor="white", edgecolor="none"))


def build_er_page(pdf):
    fig, ax = plt.subplots(figsize=(16.5, 11.7))  # A3 landscape
    ax.set_xlim(0, 33)
    ax.set_ylim(0, 22)
    ax.set_aspect("equal")
    ax.axis("off")

    ax.text(16.5, 21.2,
            "Diagrama Entidade-Relacionamento — Sistema de Gestão de Propriedades Rurais (GeoMap)",
            ha="center", va="center", fontsize=13, fontweight="bold",
            color=ENT_EDGE)

    # -------- USUARIO (esquerda) --------
    ux, uy = 5, 12
    draw_entity(ax, ux, uy, 3.2, 1.4, "USUÁRIO")

    usuario_attrs = [
        (1.2, 17.5, "id", True),
        (2.2, 19.0, "nome", False),
        (3.8, 19.7, "cpf", False),
        (5.2, 19.7, "sexo", False),
        (6.8, 19.0, "email", False),
        (7.8, 17.5, "senha", False),
        (1.0, 15.5, "reset_token", False),
        (1.0, 14.0, "criado_em", False),
    ]
    for (ax_, ay_, lbl, pk) in usuario_attrs:
        draw_attribute(ax, ax_, ay_, lbl, pk=pk)
        line(ax, ax_, ay_ - 0.25, ux, uy + 0.7)

    # -------- Relacionamento Possui (Usuario-Propriedade) --------
    draw_relationship(ax, 10.5, 12, 2.4, 1.2, "Possui")
    line(ax, ux + 1.6, uy, 9.3, 12, card="(1,1)", card_offset=(0, 0.4))

    # -------- PROPRIEDADE (centro) --------
    px, py = 16.5, 12
    draw_entity(ax, px, py, 3.6, 1.4, "PROPRIEDADE")
    line(ax, 11.7, 12, px - 1.8, py, card="(0,n)", card_offset=(0, 0.4))

    propriedade_attrs = [
        (13.0, 19.5, "id", True),
        (14.5, 20.2, "nome", False),
        (16.0, 20.5, "localizacao", False),
        (17.8, 20.5, "municipio", False),
        (19.3, 20.2, "estado", False),
        (20.5, 19.5, "cep", False),
        (13.2, 17.8, "area_total", False),
        (14.7, 18.3, "area_propria", False),
        (16.5, 18.5, "area_arrendada", False),
        (18.4, 18.3, "area_protegida", False),
        (20.0, 17.8, "num_pessoas", False),
        (13.5, 16.0, "area_cultivada", False),
        (19.5, 16.0, "criado_em", False),
        (21.0, 14.5, "atualizado_em", False),
    ]
    for (ax_, ay_, lbl, pk) in propriedade_attrs:
        draw_attribute(ax, ax_, ay_, lbl, pk=pk, rx=0.75)
        line(ax, ax_, ay_ - 0.25, px, py + 0.7)

    # -------- Rel Contém (Propriedade-Area) --------
    draw_relationship(ax, 16.5, 8, 2.4, 1.2, "Contém")
    line(ax, px, py - 0.7, 16.5, 8.6, card="(1,1)", card_offset=(0.5, 0))

    # -------- AREA (abaixo) --------
    ax_e, ay_e = 16.5, 4
    draw_entity(ax, ax_e, ay_e, 3.2, 1.4, "ÁREA")
    line(ax, 16.5, 7.4, ax_e, ay_e + 0.7, card="(0,n)", card_offset=(0.5, 0))

    area_attrs = [
        (11.5, 4.5, "id", True),
        (12.0, 2.8, "tipo", False),
        (13.8, 1.8, "geometria", False),
        (19.0, 1.8, "criado_em", False),
    ]
    for (ax_, ay_, lbl, pk) in area_attrs:
        draw_attribute(ax, ax_, ay_, lbl, pk=pk)
        line(ax, ax_ + (0.3 if ax_ < ax_e else -0.3), ay_,
             ax_e - 1.5 if ax_ < ax_e else ax_e + 1.5, ay_e)

    # -------- Rel Define (Propriedade-Categoria) --------
    draw_relationship(ax, 23, 12, 2.4, 1.2, "Define")
    line(ax, px + 1.8, py, 21.8, 12, card="(1,1)", card_offset=(0, 0.4))

    # -------- CATEGORIA (direita) --------
    cx, cy = 28, 12
    draw_entity(ax, cx, cy, 3.2, 1.4, "CATEGORIA")
    line(ax, 24.2, 12, cx - 1.6, cy, card="(0,n)", card_offset=(0, 0.4))

    categoria_attrs = [
        (26.0, 17.5, "id", True),
        (27.5, 19.0, "nome", False),
        (29.5, 19.0, "cor", False),
        (31.0, 17.5, "descricao", False),
        (31.0, 15.0, "criado_em", False),
    ]
    for (ax_, ay_, lbl, pk) in categoria_attrs:
        draw_attribute(ax, ax_, ay_, lbl, pk=pk)
        line(ax, ax_, ay_ - 0.25, cx, cy + 0.7)

    # -------- Rel Classifica (Categoria-Area) --------
    draw_relationship(ax, 23, 7, 2.4, 1.2, "Classifica")
    line(ax, cx - 1.6, cy - 0.3, 24, 7.5, card="(0,n)", card_offset=(0.5, 0))
    line(ax, 21.8, 7, 18.1, 4.2, card="(0,1)", card_offset=(-0.5, 0))

    # Legenda
    ax.text(0.5, 0.8, "Notação de Chen  |  ● = chave primária  |  "
            "Cardinalidade: (min,max)",
            fontsize=8, fontstyle="italic", color="#555")

    plt.tight_layout()
    pdf.savefig(fig, bbox_inches="tight")
    plt.close(fig)


# ---------- Página de tabelas descritivas ----------
ENTIDADES = [
    ("USUÁRIO",
     "Representa o produtor rural que utiliza o sistema. Armazena credenciais de "
     "acesso (email e senha com hash bcrypt), dados pessoais (nome, CPF, sexo) e "
     "campos de recuperação de senha (reset_token com expiração). "
     "Um usuário pode cadastrar múltiplas propriedades, sendo a entidade raiz "
     "de toda a hierarquia de dados. A chave primária é um UUID e o email "
     "possui índice único para autenticação."),
    ("PROPRIEDADE",
     "Representa um imóvel rural pertencente a um usuário. Contém dados "
     "cadastrais (nome, localização, município, estado, CEP) e métricas "
     "quantitativas em hectares (área total, própria, arrendada, protegida e "
     "cultivada), além do número de pessoas que vivem no imóvel. Cada "
     "propriedade é o container das áreas georreferenciadas e das categorias "
     "definidas pelo usuário, mantendo timestamps de criação e "
     "atualização para auditoria."),
    ("ÁREA",
     "Representa um polígono georreferenciado dentro de uma propriedade, "
     "importado via arquivo GeoJSON coletado em campo. Possui tipo (boundary = "
     "contorno geral da propriedade; internal = subdivisão interna) e uma "
     "geometria espacial armazenada como tipo PostGIS (SRID 4326, WGS84). "
     "Pode estar opcionalmente associada a uma categoria para receber cor e "
     "rótulo visual no mapa, permitindo que o produtor visualize de forma "
     "temática o uso do solo em sua propriedade."),
    ("CATEGORIA",
     "Representa uma classificação definida pelo próprio usuário "
     "(ex.: soja, pastagem, reserva legal) para rotular visualmente as áreas "
     "internas de uma propriedade. Cada categoria possui nome, cor em formato "
     "hexadecimal (#RRGGBB, usada na renderização Leaflet) e descrição "
     "opcional. Uma categoria pertence a uma única propriedade e pode classificar "
     "múltiplas áreas; a remoção de uma categoria desassocia as áreas "
     "(ON DELETE SET NULL) sem apagá-las."),
]


def build_table_page(pdf):
    fig, ax = plt.subplots(figsize=(11.7, 8.3))  # A4 landscape
    ax.axis("off")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)

    ax.text(0.5, 0.96, "Descrição das Entidades",
            ha="center", va="center", fontsize=15, fontweight="bold",
            color=ENT_EDGE)

    table_data = [["Entidade", "Descrição"]]
    for nome, desc in ENTIDADES:
        table_data.append([nome, desc])

    table = ax.table(cellText=table_data, cellLoc="left", loc="center",
                     colWidths=[0.15, 0.85])
    table.auto_set_font_size(False)
    table.set_fontsize(8.5)
    table.scale(1, 3.2)

    for (row, col), cell in table.get_celld().items():
        cell.set_edgecolor(ENT_EDGE)
        cell.set_linewidth(0.8)
        if row == 0:
            cell.set_facecolor(ENT_EDGE)
            cell.set_text_props(color="white", fontweight="bold")
        else:
            cell.set_facecolor("#F5F7FB" if row % 2 == 0 else "#FFFFFF")
            cell.set_text_props(color="#1F2937", wrap=True)
            cell.PAD = 0.04
        if col == 0 and row > 0:
            cell.set_text_props(fontweight="bold", color=ENT_EDGE)

    plt.tight_layout()
    pdf.savefig(fig, bbox_inches="tight")
    plt.close(fig)


def build_relationships_page(pdf):
    fig, ax = plt.subplots(figsize=(11.7, 8.3))
    ax.axis("off")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)

    ax.text(0.5, 0.96, "Relacionamentos e Cardinalidades",
            ha="center", va="center", fontsize=15, fontweight="bold",
            color=ENT_EDGE)

    rels = [
        ["Relacionamento", "Entidades", "Cardinalidade", "Semântica"],
        ["Possui", "Usuário ↔ Propriedade", "1:N",
         "Um usuário possui zero ou mais propriedades; cada propriedade pertence obrigatoriamente a um único usuário."],
        ["Contém", "Propriedade ↔ Área", "1:N",
         "Uma propriedade contém zero ou mais áreas (boundary ou internal); cada área pertence obrigatoriamente a uma propriedade."],
        ["Define", "Propriedade ↔ Categoria", "1:N",
         "Uma propriedade define zero ou mais categorias personalizadas; cada categoria pertence a uma única propriedade."],
        ["Classifica", "Categoria ↔ Área", "1:N (opcional)",
         "Uma categoria classifica zero ou mais áreas; cada área pode estar associada a no máximo uma categoria (associação opcional)."],
    ]

    table = ax.table(cellText=rels, cellLoc="left", loc="center",
                     colWidths=[0.15, 0.22, 0.13, 0.50])
    table.auto_set_font_size(False)
    table.set_fontsize(8.5)
    table.scale(1, 2.4)

    for (row, col), cell in table.get_celld().items():
        cell.set_edgecolor(ENT_EDGE)
        cell.set_linewidth(0.8)
        if row == 0:
            cell.set_facecolor(ENT_EDGE)
            cell.set_text_props(color="white", fontweight="bold")
        else:
            cell.set_facecolor("#F5F7FB" if row % 2 == 0 else "#FFFFFF")
            cell.set_text_props(color="#1F2937")
            if col == 0:
                cell.set_text_props(fontweight="bold", color=ENT_EDGE)

    plt.tight_layout()
    pdf.savefig(fig, bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    with PdfPages(OUTPUT) as pdf:
        build_er_page(pdf)
        build_table_page(pdf)
        build_relationships_page(pdf)
    print("PDF gerado:", OUTPUT)
