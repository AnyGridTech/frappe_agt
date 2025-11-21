import frappe

def error404():
    return frappe.redirect_to_message(
        "Página não encontrada",
        "O recurso solicitado não está disponível.",
        route="/404"
    )