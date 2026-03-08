"""
Google OR-Tools Constraint Programming Solver for Timetable Generation
Enterprise-grade solver with hard constraints and optimization objectives
"""

from ortools.sat.python import cp_model
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.timetable import Teacher, Room, Subject, ClassGroup, TimetableEntry
from app.core.config import config

class TimetableSolver:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = config.SOLVER_TIME_LIMIT
        
        # Data structures
        self.days = range(config.DAYS_PER_WEEK)
        self.periods = range(config.PERIODS_PER_DAY)
        self.variables = {}
        
    def load_resources(self) -> Dict[str, Any]:
        """Load all resources from database"""
        teachers = self.db.query(Teacher).all()
        rooms = self.db.query(Room).all()
        subjects = self.db.query(Subject).all()
        class_groups = self.db.query(ClassGroup).all()
        
        return {
            "teachers": {t.id: t for t in teachers},
            "rooms": {r.id: r for r in rooms},
            "subjects": {s.id: s for s in subjects},
            "class_groups": {cg.id: cg for cg in class_groups}
        }
    
    def create_variables(self, resources: Dict[str, Any]) -> Dict:
        """Create decision variables for the CP-SAT model"""
        variables = {}
        
        for cg_id in resources["class_groups"]:
            for day in self.days:
                for period in self.periods:
                    for subj_id in resources["subjects"]:
                        for teacher_id in resources["teachers"]:
                            for room_id in resources["rooms"]:
                                var_name = f"cg{cg_id}_d{day}_p{period}_s{subj_id}_t{teacher_id}_r{room_id}"
                                variables[var_name] = self.model.NewBoolVar(var_name)
        
        return variables
    
    def add_hard_constraints(self, resources: Dict[str, Any], variables: Dict):
        """Add hard constraints that MUST be satisfied"""
        
        # Constraint 1: Each class group has exactly one class per period
        for cg_id in resources["class_groups"]:
            for day in self.days:
                for period in self.periods:
                    slot_vars = []
                    for subj_id in resources["subjects"]:
                        for teacher_id in resources["teachers"]:
                            for room_id in resources["rooms"]:
                                var_name = f"cg{cg_id}_d{day}_p{period}_s{subj_id}_t{teacher_id}_r{room_id}"
                                if var_name in variables:
                                    slot_vars.append(variables[var_name])
                    if slot_vars:
                        self.model.Add(sum(slot_vars) == 1)
        
        # Constraint 2: Teacher cannot teach multiple classes at the same time
        for teacher_id in resources["teachers"]:
            for day in self.days:
                for period in self.periods:
                    teacher_vars = [
                        v for k, v in variables.items()
                        if f"_t{teacher_id}_" in k and f"_d{day}_p{period}_" in k
                    ]
                    if teacher_vars:
                        self.model.Add(sum(teacher_vars) <= 1)
        
        # Constraint 3: Room cannot host multiple classes at the same time
        for room_id in resources["rooms"]:
            for day in self.days:
                for period in self.periods:
                    room_vars = [
                        v for k, v in variables.items()
                        if f"_r{room_id}" in k and f"_d{day}_p{period}_" in k
                    ]
                    if room_vars:
                        self.model.Add(sum(room_vars) <= 1)
        
        # Constraint 4: Lab subjects must use lab rooms
        for subj_id, subject in resources["subjects"].items():
            if subject.requires_lab:
                for cg_id in resources["class_groups"]:
                    for day in self.days:
                        for period in self.periods:
                            for teacher_id in resources["teachers"]:
                                for room_id, room in resources["rooms"].items():
                                    if not room.is_lab:
                                        var_name = f"cg{cg_id}_d{day}_p{period}_s{subj_id}_t{teacher_id}_r{room_id}"
                                        if var_name in variables:
                                            self.model.Add(variables[var_name] == 0)
        
        # Constraint 5: Subject-Teacher compatibility (only assigned teachers can teach subjects)
        for subj_id, subject in resources["subjects"].items():
            qualified_teacher_ids = {t.id for t in subject.teachers}
            for cg_id in resources["class_groups"]:
                for day in self.days:
                    for period in self.periods:
                        for teacher_id in resources["teachers"]:
                            if teacher_id not in qualified_teacher_ids:
                                for room_id in resources["rooms"]:
                                    var_name = f"cg{cg_id}_d{day}_p{period}_s{subj_id}_t{teacher_id}_r{room_id}"
                                    if var_name in variables:
                                        self.model.Add(variables[var_name] == 0)
        
        # Constraint 6: Weekly session requirements
        for cg_id in resources["class_groups"]:
            for subj_id, subject in resources["subjects"].items():
                weekly_vars = [
                    v for k, v in variables.items()
                    if f"cg{cg_id}_" in k and f"_s{subj_id}_" in k
                ]
                if weekly_vars:
                    self.model.Add(sum(weekly_vars) == subject.weekly_sessions)
    
    def add_soft_constraints(self, resources: Dict[str, Any], variables: Dict):
        """Add optimization objectives"""
        
        # Objective: Minimize gaps in student schedules
        gap_penalties = []
        
        for cg_id in resources["class_groups"]:
            for day in self.days:
                for period in range(len(self.periods) - 1):
                    # Check if there's a class in current period but not in next
                    current_period_vars = [
                        v for k, v in variables.items()
                        if f"cg{cg_id}_d{day}_p{period}_" in k
                    ]
                    next_period_vars = [
                        v for k, v in variables.items()
                        if f"cg{cg_id}_d{day}_p{period+1}_" in k
                    ]
                    
                    # Add penalty for gaps
                    if current_period_vars and next_period_vars:
                        has_current = self.model.NewBoolVar(f"has_cg{cg_id}_d{day}_p{period}")
                        has_next = self.model.NewBoolVar(f"has_cg{cg_id}_d{day}_p{period+1}")
                        gap = self.model.NewBoolVar(f"gap_cg{cg_id}_d{day}_p{period}")
                        
                        self.model.Add(sum(current_period_vars) >= 1).OnlyEnforceIf(has_current)
                        self.model.Add(sum(next_period_vars) >= 1).OnlyEnforceIf(has_next)
                        
                        gap_penalties.append(gap)
        
        # Minimize total gaps
        if gap_penalties:
            self.model.Minimize(sum(gap_penalties))
    
    def solve(self) -> Tuple[bool, Dict[str, Any]]:
        """Run the solver and return results"""
        resources = self.load_resources()
        
        if not resources["teachers"] or not resources["rooms"] or not resources["subjects"] or not resources["class_groups"]:
            return False, {"error": "Insufficient resources. Need at least 1 teacher, room, subject, and class group."}
        
        variables = self.create_variables(resources)
        self.add_hard_constraints(resources, variables)
        self.add_soft_constraints(resources, variables)
        
        status = self.solver.Solve(self.model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            schedule = self.extract_solution(variables, resources)
            return True, {
                "status": "optimal" if status == cp_model.OPTIMAL else "feasible",
                "schedule": schedule,
                "stats": {
                    "solve_time": self.solver.WallTime(),
                    "conflicts": self.solver.NumConflicts(),
                    "branches": self.solver.NumBranches()
                }
            }
        else:
            return False, {
                "error": "No feasible solution found. Check constraints and resources.",
                "status": "infeasible"
            }
    
    def extract_solution(self, variables: Dict, resources: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract the solution from the model"""
        schedule = []
        
        for var_name, var in variables.items():
            if self.solver.Value(var) == 1:
                # Parse variable name: cg{cg_id}_d{day}_p{period}_s{subj_id}_t{teacher_id}_r{room_id}
                parts = var_name.split('_')
                cg_id = int(parts[0][2:])
                day = int(parts[1][1:])
                period = int(parts[2][1:])
                subj_id = int(parts[3][1:])
                teacher_id = int(parts[4][1:])
                room_id = int(parts[5][1:])
                
                schedule.append({
                    "class_group_id": cg_id,
                    "class_group_name": resources["class_groups"][cg_id].name,
                    "day": day,
                    "period": period,
                    "subject_id": subj_id,
                    "subject_name": resources["subjects"][subj_id].name,
                    "subject_code": resources["subjects"][subj_id].code,
                    "teacher_id": teacher_id,
                    "teacher_name": resources["teachers"][teacher_id].name,
                    "room_id": room_id,
                    "room_number": resources["rooms"][room_id].room_number,
                })
        
        return sorted(schedule, key=lambda x: (x["class_group_id"], x["day"], x["period"]))
    
    def save_to_database(self, schedule: List[Dict[str, Any]]) -> bool:
        """Save the generated schedule to database"""
        try:
            # Clear existing timetable
            self.db.query(TimetableEntry).delete()
            
            # Insert new entries
            for entry in schedule:
                timetable_entry = TimetableEntry(
                    day=entry["day"],
                    period=entry["period"],
                    teacher_id=entry["teacher_id"],
                    room_id=entry["room_id"],
                    subject_id=entry["subject_id"],
                    class_group_id=entry["class_group_id"]
                )
                self.db.add(timetable_entry)
            
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error saving to database: {e}")
            return False
