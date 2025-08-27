import { SIMON_CONTEXT, type SimonContextDoc } from "./data/simon";

export class SimonContextRetriever {
  private doc: SimonContextDoc;

  constructor(doc: SimonContextDoc = SIMON_CONTEXT) {
    this.doc = doc;
  }

  public getSystemInstruction(): string {
    return (
      "You are a portfolio assistant for Simon Curran. " +
      "Reply ONLY using the facts provided in the Simon Context below. " +
      "If a question is outside that context, say you don't know and ask the user to rephrase within scope."
    );
  }

  public buildContextText(): string {
    const lines: string[] = [];
    lines.push(`Owner: ${this.doc.owner}`);
    if (this.doc.location) lines.push(`Location: ${this.doc.location}`);
    lines.push(`Summary: ${this.doc.summary}`);
    if (this.doc.skills?.length) {
      lines.push(`Skills: ${this.doc.skills.join(", ")}`);
    }
    if ((this.doc as any).workPreferences?.length) {
      lines.push("Work Preferences:");
      (this.doc as any).workPreferences.forEach((p: string) =>
        lines.push(`- ${p}`)
      );
    }
    if (this.doc.experience?.length) {
      lines.push("Experience:");
      this.doc.experience.forEach(exp => {
        lines.push(
          `- ${exp.title} @ ${exp.company} (${exp.start} – ${exp.end})`
        );
        exp.highlights.forEach(h => lines.push(`  • ${h}`));
      });
    }
    if (this.doc.projects?.length) {
      lines.push("Projects:");
      this.doc.projects.forEach(p => {
        lines.push(`- ${p.name}: ${p.description}`);
        if (p.tech?.length) lines.push(`  Tech: ${p.tech.join(", ")}`);
        if (p.outcomes?.length) p.outcomes.forEach(o => lines.push(`  • ${o}`));
      });
    }
    if ((this.doc as any).personal) {
      const personal = (this.doc as any).personal as {
        about?: string;
        interests?: string[];
      };
      lines.push("Personal:");
      if (personal.about) lines.push(`- ${personal.about}`);
      if (personal.interests?.length)
        lines.push(`  Interests: ${personal.interests.join(", ")}`);
    }
    return lines.join("\n");
  }
}
