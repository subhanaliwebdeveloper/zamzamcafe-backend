package com.zamzamcafe.repository;
import com.zamzamcafe.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface OrderRepository extends JpaRepository<Order,Long>{ List<Order> findByPhone(String phone); }