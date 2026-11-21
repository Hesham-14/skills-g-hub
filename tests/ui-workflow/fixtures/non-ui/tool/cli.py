"""Fixture only: a command-line tool with no rendered UI."""
import click


@click.command()
@click.argument("pattern")
def main(pattern: str) -> None:
    click.echo(f"searching for {pattern}")
