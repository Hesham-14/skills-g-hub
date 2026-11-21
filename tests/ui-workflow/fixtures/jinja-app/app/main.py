"""Fixture only: a FastAPI + Jinja2 app shape for stack detection and routing cases."""
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates

app = FastAPI()
templates = Jinja2Templates(directory="app/templates")


@app.get("/offers")
def offers(request: Request):
    rows = [{"name": "عرض تجريبي", "price": 1_000, "gate": "pass"}]
    return templates.TemplateResponse(request, "offers.html", {"offers": rows, "nav": "offers"})
