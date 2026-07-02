/**
 * Calculates a skill match score between a user's skills and a ticket's required skills.
 * Case-insensitive, punctuation-insensitive, and substring friendly.
 */
export const calculateMatchScore = (memberSkills, requiredSkills) => {
  if (!memberSkills || !requiredSkills || requiredSkills.length === 0) return 0;
  
  let score = 0;
  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const normalizedRequired = requiredSkills.map(s => normalize(s)).filter(Boolean);
  const normalizedMember = memberSkills.map(s => normalize(s)).filter(Boolean);
  
  for (const reqSkill of normalizedRequired) {
    for (const memSkill of normalizedMember) {
      if (
        memSkill === reqSkill || 
        memSkill.includes(reqSkill) || 
        reqSkill.includes(memSkill)
      ) {
        score += 1;
        break; // Match each required skill at most once
      }
    }
  }
  
  return score;
};

/**
 * Finds the best matching member in the organization based on skill score.
 * Falls back to the admin if no member has matching skills.
 */
export const findBestModerator = async (prisma, orgId, requiredSkills) => {
  const members = await prisma.users.findMany({
    where: {
      organization_id: orgId,
      role: "member",
    },
  });

  if (members.length === 0) {
    return await prisma.users.findFirst({
      where: {
        organization_id: orgId,
        role: "admin",
      },
    });
  }

  // Score each member
  const scoredMembers = members.map(member => ({
    member,
    score: calculateMatchScore(member.skills, requiredSkills),
  }));

  // Sort by score descending
  scoredMembers.sort((a, b) => b.score - a.score);

  const bestMatch = scoredMembers[0];

  // If the best match score is > 0, return that member
  if (bestMatch && bestMatch.score > 0) {
    return bestMatch.member;
  }

  // Fallback to admin if no matching skills found
  return await prisma.users.findFirst({
    where: {
      organization_id: orgId,
      role: "admin",
    },
  });
};
