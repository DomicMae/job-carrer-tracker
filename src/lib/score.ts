export type Requirement = {
  id?: string;
  skill_name: string;
  kind: 'required' | 'preferred';
  source_excerpt?: string;
  confirmed_by_user?: boolean;
};

export type SkillProficiency = 'learning' | 'used_in_project' | 'used_at_work';

export function normalizeSkill(s: string) {
  return s.trim().toLowerCase();
}

export type SkillEvaluation = {
  requirement: Requirement;
  status: 'verified_match' | 'needs_confirmation' | 'missing';
  userSkillEvidence?: string;
  proficiency?: SkillProficiency;
};

export function evaluateRequirements(
  requirements: Requirement[],
  userSkills: { skill_name: string; proficiency: SkillProficiency; evidence_text?: string | null }[]
): {
  evaluations: SkillEvaluation[];
  matchedCount: number;
  totalRequiredCount: number;
  scorePercent: number | null;
} {
  const skillMap = new Map<string, { proficiency: SkillProficiency; evidence?: string | null }>();
  for (const s of userSkills) {
    skillMap.set(normalizeSkill(s.skill_name), {
      proficiency: s.proficiency,
      evidence: s.evidence_text,
    });
  }

  let matchedCount = 0;
  let totalRequiredCount = 0;

  const evaluations: SkillEvaluation[] = requirements.map((req) => {
    const norm = normalizeSkill(req.skill_name);
    const userSkill = skillMap.get(norm);
    const isRequired = req.kind === 'required';

    if (isRequired && req.confirmed_by_user) {
      totalRequiredCount++;
    }

    if (!userSkill) {
      return {
        requirement: req,
        status: 'missing',
      };
    }

    if (userSkill.proficiency === 'learning') {
      return {
        requirement: req,
        status: 'needs_confirmation',
        proficiency: userSkill.proficiency,
        userSkillEvidence: userSkill.evidence || undefined,
      };
    }

    // used_in_project or used_at_work
    if (isRequired && req.confirmed_by_user) {
      matchedCount++;
    }

    return {
      requirement: req,
      status: 'verified_match',
      proficiency: userSkill.proficiency,
      userSkillEvidence: userSkill.evidence || undefined,
    };
  });

  const scorePercent =
    totalRequiredCount > 0 ? Math.round((matchedCount / totalRequiredCount) * 100) : null;

  return {
    evaluations,
    matchedCount,
    totalRequiredCount,
    scorePercent,
  };
}
