import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import profile from './profile.json' with { type: 'json' };

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  about() {
    return profile;
  }

  links() {
    return this.prisma.professionalLink.findMany({
      select: { name: true, url: true },
      orderBy: { id: 'asc' },
    });
  }

  skills() {
    return this.prisma.skill.findMany({
      select: { name: true },
      orderBy: { id: 'asc' },
    });
  }

  experience() {
    return this.prisma.workExperience.findMany({
      select: { company: true, position: true, startDate: true, endDate: true, achievements: true },
      orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
    });
  }

  projects() {
    return this.prisma.project.findMany({
      select: { name: true, url: true },
      orderBy: { id: 'asc' },
    });
  }
}
