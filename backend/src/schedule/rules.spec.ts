import { intervalsProblem, sortIntervals, TIME_PATTERN, toMinutes } from './rules';

describe('schedule rules', () => {
  it('time format: HH:MM, and 24:00 only as itself', () => {
    for (const ok of ['00:00', '09:30', '23:45', '24:00']) expect(TIME_PATTERN.test(ok)).toBe(true);
    for (const bad of ['9:00', '24:15', '25:00', '12:60', '12:00:00', '']) expect(TIME_PATTERN.test(bad)).toBe(false);
    expect(toMinutes('24:00')).toBe(1440);
  });

  it('a normal day with a lunch break; touching intervals are fine', () => {
    expect(
      intervalsProblem([
        { start: '09:00', end: '13:00' },
        { start: '14:00', end: '18:00' },
      ]),
    ).toBeNull();
    expect(
      intervalsProblem([
        { start: '09:00', end: '13:00' },
        { start: '13:00', end: '18:00' },
      ]),
    ).toBeNull();
    expect(intervalsProblem([{ start: '00:00', end: '24:00' }])).toBeNull();
    expect(intervalsProblem([])).toBeNull();
  });

  it('overlaps are refused, whatever the order given', () => {
    expect(
      intervalsProblem([
        { start: '12:00', end: '18:00' },
        { start: '09:00', end: '13:00' },
      ]),
    ).toBe('09:00–13:00 and 12:00–18:00 overlap');
  });

  it('end after start, any minute, 24:00 not as a start', () => {
    expect(intervalsProblem([{ start: '18:00', end: '09:00' }])).toMatch(/end must be after the start/);
    expect(intervalsProblem([{ start: '10:00', end: '10:00' }])).toMatch(/end must be after the start/);
    expect(intervalsProblem([{ start: '09:10', end: '10:00' }])).toBeNull();
    expect(intervalsProblem([{ start: '24:00', end: '24:00' }])).toMatch(/24:00 can only end a day/);
  });

  it('at most 6 intervals a day', () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ start: `${10 + i}:00`, end: `${10 + i}:30` }));
    expect(intervalsProblem(seven)).toMatch(/At most 6/);
  });

  it('sorts by start', () => {
    expect(
      sortIntervals([
        { start: '14:00', end: '18:00' },
        { start: '09:00', end: '13:00' },
      ]),
    ).toEqual([
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '18:00' },
    ]);
  });
});
