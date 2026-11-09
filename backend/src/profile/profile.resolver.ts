import { Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ProfileService } from './profile.service.js';

@Resolver('About')
export class AboutResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Query()
  about() {
    return this.profileService.about();
  }

  @ResolveField()
  links() {
    return this.profileService.links();
  }
}

@Resolver('Profile')
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Query()
  profile() {
    return this.profileService.about();
  }

  @ResolveField()
  links() {
    return this.profileService.links();
  }

  @Query('skills')
  querySkills() {
    return this.profileService.skills();
  }

  @ResolveField()
  skills() {
    return this.profileService.skills();
  }

  @Query('experience')
  queryExperience() {
    return this.profileService.experience();
  }

  @ResolveField()
  experience() {
    return this.profileService.experience();
  }

  @Query('projects')
  queryProjects() {
    return this.profileService.projects();
  }

  @ResolveField()
  projects() {
    return this.profileService.projects();
  }
}
