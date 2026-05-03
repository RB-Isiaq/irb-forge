import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class OrganizationsRepository {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
  ) {}

  create(data: Partial<Organization>): Promise<Organization> {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    await this.repo.update(id, data);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async generateUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!(await this.repo.findOne({ where: { slug: base } }))) return base;

    let slug = base;
    for (let i = 0; i < 10; i++) {
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${base}-${suffix}`;
      if (!(await this.repo.findOne({ where: { slug } }))) return slug;
    }
    return slug;
  }
}
